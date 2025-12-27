from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlmodel import Session, select, or_
from typing import List
import os
import io
import json
import logging
from PIL import Image as PILImage
from pillow_heif import register_heif_opener

from app.db.session import get_session
from app.db.models import Image, User
from app.core import security
import datetime

register_heif_opener()
logger = logging.getLogger("backend")
router = APIRouter()

from typing import List, Optional

from sqlalchemy import func

@router.get("/", response_model=List[Image])
def read_images(
    offset: int = 0, 
    limit: int = 100, 
    sort_order: str = 'desc',
    location: Optional[str] = None,
    session: Session = Depends(get_session), 
    current_user: User = Depends(security.get_current_user)
):
    logger.info(f"User: {current_user.username}, Is Admin: {current_user.is_admin}")
    
    query = select(Image)
    
    # Permission Check
    if not current_user.is_admin:
        if not current_user.allowed_paths:
             return [] 
             
        try:
            allowed = json.loads(current_user.allowed_paths)
            if not allowed:
                return []
            
            conditions = [Image.path.startswith(p) for p in allowed]
            query = query.where(or_(*conditions))
        except:
             return []

    if location:
        # Decode if necessary or assume client sends correct string. 
        # Ideally, exact match or case insensitive.
        query = query.where(Image.location == location)

    # Sorting
    if sort_order == 'asc':
        query = query.order_by(Image.capture_date.asc(), Image.timestamp.asc())
    else:
        query = query.order_by(Image.capture_date.desc(), Image.timestamp.desc())

    images = session.exec(query.offset(offset).limit(limit)).all()
    return images

@router.get("/timeline")
def get_timeline(session: Session = Depends(get_session)):
    # Extract Year-Month from capture_date
    # SQLite uses strftime
    # We want distinct dates
    
    # query = select(func.strftime('%Y-%m', Image.capture_date)).distinct().order_by(func.strftime('%Y-%m', Image.capture_date).desc())
    # However, SQLModel might need raw SQL or specific construct.
    # Let's try simple python properties if dataset is small, but SQL is better.
    
    # Note: If capture_date is NULL, use timestamp.
    # COALESCE equivalent: func.coalesce(Image.capture_date, Image.timestamp)
    
    # COALESCE equivalent: func.coalesce(Image.capture_date, Image.timestamp)
    
    date_col = func.coalesce(Image.capture_date, Image.timestamp)
    # Postgres uses to_char, SQLite uses strftime. The user is on Postgres (psycopg2).
    # Format as YYYY-MM for sorting
    statement = select(func.to_char(date_col, 'YYYY-MM')).distinct().order_by(func.to_char(date_col, 'YYYY-MM').desc())
    
    results = session.exec(statement).all()
    
    # Convert "2025-12" to "December 2025"
    formatted_timeline = []
    for ym in results:
        if not ym: continue
        try:
            year, month = map(int, ym.split('-'))
            date_obj = datetime.date(year, month, 1)
            formatted_timeline.append(date_obj.strftime('%B %Y'))
        except:
            continue
            
    return formatted_timeline

@router.get("/date-offset")
def get_date_offset(
    date: str, 
    sort_order: str = 'desc',
    session: Session = Depends(get_session),
    current_user: User = Depends(security.get_current_user)
):
    # date format expected: YYYY-MM-DD or YYYY-MM (we will handle start/end of month if YYYY-MM)
    # Ideally frontend sends a specific date, e.g. 1st of month.
    
    try:
        # Simple parsing. If length is 7 (YYYY-MM), treat as month boundary.
        if len(date) == 7:
            year, month = map(int, date.split('-'))
            target_date = datetime.datetime(year, month, 1)
            # For desc sort (newest first), we want count of images NEWER than target.
            # If target is Dec 1 2025, and we want to jump to Dec 2025.
            # We want to start at the first image of Dec 2025.
            # So skip all images > end of Dec 2025? 
            # OR just skip images > Dec 1 2025?
            # Actually, "Dec 2025" usually means show me Dec 2025.
            # If sorted desc, the first image is the latest in Dec 2025.
            # So we should count images > Dec 31 2025 23:59:59.
            if sort_order == 'desc':
                # End of month
                if month == 12:
                    target_date = datetime.datetime(year + 1, 1, 1) - datetime.timedelta(seconds=1)
                else:
                    target_date = datetime.datetime(year, month + 1, 1) - datetime.timedelta(seconds=1)
            else:
                # Asc: we want to start at first image of Dec 2025.
                # So count images < Dec 1 2025.
                target_date = datetime.datetime(year, month, 1)
        else:
             target_date = datetime.datetime.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    query = select(func.count(Image.id))
    
    # Permission Check
    if not current_user.is_admin:
        if not current_user.allowed_paths:
             return {"offset": 0}
        try:
            allowed = json.loads(current_user.allowed_paths)
            if allowed:
                conditions = [Image.path.startswith(p) for p in allowed]
                query = query.where(or_(*conditions))
        except:
             return {"offset": 0}

    date_col = func.coalesce(Image.capture_date, Image.timestamp)

    if sort_order == 'asc':
        # Count items BEFORE target_date (items < target_date)
        query = query.where(date_col < target_date)
    else:
        # Count items BEFORE target_date in DESC order.
        # "Before" in a list sorted DESC means "Newer than".
        # So count items > target_date.
        query = query.where(date_col > target_date)

    count = session.exec(query).one()
    return {"offset": count}

@router.get("/content/{image_id}")
def get_image_content(image_id: int, session: Session = Depends(get_session)):
    image = session.get(Image, image_id)
    if not image or not os.path.exists(image.path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Send HEIC/HEIF as JPEG
    if image.path.lower().endswith(('.heic', '.heif')):
        try:
            img = PILImage.open(image.path)
            img_io = io.BytesIO()
            img.convert('RGB').save(img_io, 'JPEG', quality=80)
            img_io.seek(0)
            return StreamingResponse(img_io, media_type="image/jpeg")
        except Exception as e:
            logger.error(f"Error converting HEIC {image.path}: {e}")
            return FileResponse(image.path)

    return FileResponse(image.path)
