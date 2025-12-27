from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, SQLModel
from sqlalchemy import inspect
from models import Image, Person, Face
from database import engine, get_session, create_db_and_tables
import scanner
import os
import logging
from logging.handlers import RotatingFileHandler
from pydantic import BaseModel
from typing import *
from dotenv import load_dotenv
from models import Image, Person, Face, User, SessionToken
from auth import create_access_token, get_current_user, verify_password, get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES, oauth2_scheme
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta, datetime
from fastapi import status
from sqlalchemy import or_
import json

load_dotenv()



# Auth Endpoint
class UserCreate(BaseModel):
    username: str
    password: str


# Logging Setup
log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
os.makedirs(log_dir, exist_ok=True)

# Backend Logger
file_handler = RotatingFileHandler(os.path.join(log_dir, "backend.log"), maxBytes=10*1024*1024, backupCount=5)
file_handler.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))
console_handler = logging.StreamHandler()
console_handler.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))

logging.basicConfig(
    level=logging.INFO,
    handlers=[file_handler, console_handler]
)
logger = logging.getLogger("backend")

# Capture Uvicorn Logs
logging.getLogger("uvicorn.access").handlers = [file_handler, console_handler]
logging.getLogger("uvicorn.error").handlers = [file_handler, console_handler]

# Frontend Logger Setup (for incoming logs)
frontend_logger = logging.getLogger("frontend")
frontend_handler = RotatingFileHandler(os.path.join(log_dir, "frontend.log"), maxBytes=10*1024*1024, backupCount=5)
frontend_handler.setFormatter(logging.Formatter("%(asctime)s - FRONTEND - %(levelname)s - %(message)s"))
frontend_logger.addHandler(frontend_handler)
frontend_logger.propagate = False


app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    # Store session
    session_token = SessionToken(
        token=access_token,
        user_id=user.id,
        expires_at=datetime.utcnow() + access_token_expires
    )
    session.add(session_token)
    session.commit()
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/logout")
def logout(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    # Remove from DB
    session.exec(select(SessionToken).where(SessionToken.token == token)).one_or_none()
    # Actually explicit delete
    statement = select(SessionToken).where(SessionToken.token == token)
    results = session.exec(statement)
    for res in results:
        session.delete(res)
    session.commit()
    return {"status": "logged_out"}
# ... logging setup ...

@app.post("/signup")
def signup(user: UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.username == user.username)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Check if this is the first user
    user_count = session.exec(select(User)).all()
    is_first = len(user_count) == 0
    
    hashed_password = get_password_hash(user.password)
    new_user = User(
        username=user.username, 
        hashed_password=hashed_password,
        is_admin=is_first # First user is Admin
    )
    session.add(new_user)
    session.commit()
    return {"status": "User created", "is_admin": is_first}


@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# API Endpoints
@app.get("/images", response_model=List[Image])
def read_images(offset: int = 0, limit: int = 100, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    # Permission Check
    logger.info(f"User: {current_user.username}, Is Admin: {current_user.is_admin}, Paths: {current_user.allowed_paths}")
    query = select(Image)
    
    if not current_user.is_admin:
        if not current_user.allowed_paths:
             logger.info("Access denied: No admin rights and no allowed paths")
             return [] # No access
             
        try:
            allowed = json.loads(current_user.allowed_paths)
            if not allowed:
                 logger.info("Access denied: Empty allowed paths")
                 return []
            
            # Filter query
            conditions = [Image.path.startswith(p) for p in allowed]
            query = query.where(or_(*conditions))
        except:
             logger.error("Error parsing allowed_paths")
             return [] # Error parsing paths

    images = session.exec(query.offset(offset).limit(limit)).all()
    logger.info(f"Returning {len(images)} images")
    return images

class PersonRead(SQLModel):
    id: int
    name: str
    cover_photo: Optional[str] = None
    photo_count: int = 0

@app.get("/people", response_model=List[PersonRead])
def read_people(session: Session = Depends(get_session)):
    people = session.exec(select(Person)).all()
    result = []
    for p in people:
        # Get count
        # This is n+1 but okay for small list of people. Optimize later if needed.
        # Find all faces for this person
        # We need to access p.faces
        
        # Get cover photo from first face
        cover = None
        count = 0 
        
        if p.faces:
            count = len(p.faces)
            
            # Logic: Try to find an image with ONLY ONE face (the person themselves)
            best_face = None
            
            # First pass: Look for single-face images
            for f in p.faces:
                if f.image and len(f.image.faces) == 1:
                    best_face = f
                    break
            
            # Fallback: If no single-face image, just take the first one
            if not best_face:
                for f in p.faces:
                    if f.image:
                        best_face = f
                        break
            
            # Set cover
            if best_face and best_face.image:
                cover = best_face.image.thumbnail
                if not cover:
                    cover = f"/image_content/{best_face.image.id}"

        result.append(PersonRead(
            id=p.id,
            name=p.name,
            cover_photo=cover,
            photo_count=count
        ))
        
    return result

class PersonUpdate(BaseModel):
    name: str

@app.put("/people/{person_id}", response_model=Person)
def update_person(person_id: int, person_update: PersonUpdate, session: Session = Depends(get_session)):
    db_person = session.get(Person, person_id)
    if not db_person:
        raise HTTPException(status_code=404, detail="Person not found")
    db_person.name = person_update.name
    session.add(db_person)
    session.commit()
    session.refresh(db_person)
    return db_person

class MergeRequest(BaseModel):
    target_id: int
    source_ids: List[int]

@app.post("/people/merge")
def merge_people(request: MergeRequest, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    target = session.get(Person, request.target_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target person not found")
    
    for source_id in request.source_ids:
        if source_id == request.target_id:
            continue
            
        source = session.get(Person, source_id)
        if not source:
            continue
            
        # Reassign faces
        for face in source.faces:
            face.person_id = target.id
            session.add(face)
        
        # Delete source person
        session.delete(source)
    
    session.commit()
    return {"status": "success", "message": f"Merged {len(request.source_ids)} people into {target.name}"}

@app.get("/people/{person_id}/images", response_model=List[Image])
def read_person_images(person_id: int, session: Session = Depends(get_session)):
    person = session.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    # This query might need to be optimized or adjusted based on relationship
    # person.faces is a list of Face objects, each matched to an Image
    # We want unique images
    image_ids = {face.image_id for face in person.faces if face.image_id}
    images = session.exec(select(Image).where(Image.id.in_(image_ids))).all()
    return images

# Serve images functionality
# In a real app we might want to be careful about serving any file
# For this local app, we can serve requests by path if verified
from fastapi.responses import FileResponse, StreamingResponse
from pillow_heif import register_heif_opener
from PIL import Image as PILImage
import io

register_heif_opener()

@app.get("/image_content/{image_id}")
def get_image_content(image_id: int, session: Session = Depends(get_session)):
    image = session.get(Image, image_id)
    if not image or not os.path.exists(image.path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Send HEIC/HEIF as JPEG
    if image.path.lower().endswith(('.heic', '.heif')):
        try:
            img = PILImage.open(image.path)
            img_io = io.BytesIO()
            # Convert to RGB (HEIC can be RGBA or other modes dependent on bit depth)
            img.convert('RGB').save(img_io, 'JPEG', quality=80)
            img_io.seek(0)
            return StreamingResponse(img_io, media_type="image/jpeg")
        except Exception as e:
            logger.error(f"Error converting HEIC {image.path}: {e}")
            # Fallback to file response if conversion fails (browser likely won't render it)
            return FileResponse(image.path)

    return FileResponse(image.path)

# Logging Endpoint
class LogMessage(BaseModel):
    level: str
    message: str
    context: dict = {}

@app.post("/logs")
def log_frontend(log: LogMessage):
    msg = f"{log.message} | Context: {log.context}"
    if log.level.upper() == "ERROR":
        frontend_logger.error(msg)
    elif log.level.upper() == "WARN" or log.level.upper() == "WARNING":
        frontend_logger.warning(msg)
    else:
        frontend_logger.info(msg)
    return {"status": "ok"}

@app.post("/scan")
def trigger_scan(background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user)):
    photos_dir_env = os.getenv("PHOTOS_DIR")
    if not photos_dir_env:
        logger.error("PHOTOS_DIR not set")
        raise HTTPException(status_code=400, detail="PHOTOS_DIR not configured")
    
    # Split by semicolon and strip whitespace
    paths = [p.strip() for p in photos_dir_env.split(";") if p.strip()]
    
    valid_paths = []
    for p in paths:
        if os.path.exists(p):
            valid_paths.append(p)
        else:
            logger.error(f"Directory not found: {p}")
            # Depending on strictness, we might warn or error. 
            # User said "throw an error", let's assume strictness for the API call
            raise HTTPException(status_code=400, detail=f"Directory not found: {p}")
            
    for p in valid_paths:
        background_tasks.add_task(scanner.scan_directory, p)
        
    return {"status": "Scan started", "directories": valid_paths}
