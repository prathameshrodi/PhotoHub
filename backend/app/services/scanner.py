import os
import json
import logging
import numpy as np
from sqlmodel import Session, select
from app.db.models import Image, Person, Face
from app.db.session import engine
from app.services import metadata
import io
import base64
from PIL import Image as PILImage
from pillow_heif import register_heif_opener

register_heif_opener()
from app.core import config

# Setup Scanner Logger
logger = logging.getLogger("scanner")
logger.setLevel(logging.INFO)
scanner_handler = logging.FileHandler(os.path.join(config.settings.LOG_DIR, "scanner.log"))
scanner_handler.setFormatter(logging.Formatter("%(asctime)s - SCANNER - %(levelname)s - %(message)s"))
logger.addHandler(scanner_handler)

try:
    import face_recognition
    FACE_REC_AVAILABLE = True
except ImportError:
    FACE_REC_AVAILABLE = False
    logger.warning("face_recognition not installed. Skipping face detection.")

try:
    import reverse_geocoder as rg
    RG_AVAILABLE = True
except ImportError:
    RG_AVAILABLE = False
    logger.warning("reverse_geocoder not installed. Location names will be missing.")

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG', '.heic', '.HEIC', '.heif'}
TOLERANCE = 0.6

def generate_thumbnail(file_path: str, max_size=(300, 300)) -> str:
    try:
        with PILImage.open(file_path) as img:
            if img.mode != 'RGB':
                img = img.convert('RGB')
            img.thumbnail(max_size)
            buffered = io.BytesIO()
            img.save(buffered, format="JPEG", quality=70)
            return base64.b64encode(buffered.getvalue()).decode('utf-8')
    except Exception as e:
        logger.warning(f"Thumbnail generation failed for {file_path}: {e}")
        return None

def resolve_location(lat, lon):
    if not RG_AVAILABLE or lat is None or lon is None:
        return None
    try:
        results = rg.search((lat, lon))
        if results:
            # City, Country Code (e.g. San Francisco, US)
            return f"{results[0]['name']}, {results[0]['cc']}"
    except Exception as e:
        logger.warning(f"Reverse geocode failed: {e}")
    return None

def scan_directory(root_dir: str):
    logger.info(f"Scanning {root_dir}...")
    
    found_files = []
    with Session(engine) as session:
        PREFIX = "data:image/jpeg;base64,"

        # 1. Collect paths
        for root, dirs, files in os.walk(root_dir):
            for file in files:
                if file.startswith("._"): 
                    continue
                if os.path.splitext(file)[1].lower() in ALLOWED_EXTENSIONS:
                    found_files.append(os.path.join(root, file))
        
        # 2. Check existing
        existing_images = session.exec(select(Image)).all()
        existing_map = {img.path: img for img in existing_images}
        
        # 3. New files
        new_files = [f for f in found_files if f not in existing_map]
        
        # 3.5 Backfill Thumbnails (and maybe metadata?) for existing
        # For this refactor, let's just focus on thumbnails. Metadata backfill script can be separate.
        for path, img in existing_map.items():
            if not img.thumbnail:
                thumb = generate_thumbnail(path)
                if thumb:
                    img.thumbnail = PREFIX + thumb
                    session.add(img)

        session.commit()

        if not new_files:
            logger.info("No new images found.")
            return

        logger.info(f"Found {len(new_files)} new images.")
        
        # 4. Process New Images
        BATCH_SIZE = 100
        batch = []
        
        total_processed = 0
        
        for p in new_files:
            # Extract Metadata
            meta = metadata.extract_metadata(p)
            location_name = resolve_location(meta["latitude"], meta["longitude"])
            
            img = Image(
                path=p, 
                filename=os.path.basename(p),
                capture_date=meta["capture_date"],
                latitude=meta["latitude"],
                longitude=meta["longitude"],
                format=meta["format"],
                location=location_name
            )
            
            thumb = generate_thumbnail(p)
            if thumb:
                img.thumbnail = PREFIX + thumb
            
            batch.append(img)
            
            if len(batch) >= BATCH_SIZE:
                session.add_all(batch)
                session.commit()
                
                # 5. Face Rec (for batch)
                for img_obj in batch:
                    session.refresh(img_obj)
                    process_face_recognition(session, img_obj)
                
                total_processed += len(batch)
                logger.info(f"Processed batch of {len(batch)} images ({total_processed}/{len(new_files)})")
                batch = []

        # Process remaining
        if batch:
            session.add_all(batch)
            session.commit()
            for img_obj in batch:
                session.refresh(img_obj)
                process_face_recognition(session, img_obj)
            total_processed += len(batch)
            logger.info(f"Processed final batch of {len(batch)} images.")
            
    logger.info("Scan complete.")

def process_face_recognition(session: Session, db_image: Image):
    if not FACE_REC_AVAILABLE:
        return

    try:
        image_data = face_recognition.load_image_file(db_image.path)
        face_locations = face_recognition.face_locations(image_data)
        face_encodings = face_recognition.face_encodings(image_data, face_locations)

        for encoding in face_encodings:
            register_face(session, db_image, encoding)
                
    except Exception as e:
        logger.error(f"Error processing faces for {db_image.path}: {e}")

def register_face(session: Session, db_image: Image, encoding: np.ndarray):
    people = session.exec(select(Person)).all()
    
    match_found = False
    
    for person in people:
        if person.faces:
            known_encoding = np.array(json.loads(person.faces[0].encoding))
            match = face_recognition.compare_faces([known_encoding], encoding, tolerance=TOLERANCE)
            if match[0]:
                assign_face_to_person(session, db_image, person, encoding)
                match_found = True
                break
    
    if not match_found:
        new_person = Person(name=f"Person {len(people) + 1}")
        session.add(new_person)
        session.commit()
        session.refresh(new_person)
        assign_face_to_person(session, db_image, new_person, encoding)

def assign_face_to_person(session: Session, db_image: Image, person: Person, encoding: np.ndarray):
    db_face = Face(
        image_id=db_image.id,
        person_id=person.id,
        encoding=json.dumps(encoding.tolist())
    )
    session.add(db_face)
    session.commit()
import threading
import time

def scan_background_loop():
    logger.info("Starting background scan loop...")
    photos_dir = os.environ.get("PHOTOS_DIR")
    if not photos_dir:
        logger.error("PHOTOS_DIR not set. Background scanner stopped.")
        return

    # Handle multiple paths
    paths = [p.strip() for p in photos_dir.split(';') if p.strip()]
    if not paths:
        logger.error("No valid paths in PHOTOS_DIR.")
        return

    while True:
        try:
             for path in paths:
                 if os.path.isdir(path):
                     scan_directory(path)
                 else:
                     logger.warning(f"Scan path not found: {path}")
        except Exception as e:
            logger.error(f"Error in background scan: {e}")
        
        # Sleep for 5 minutes
        time.sleep(300)

def start_background_scanner():
    t = threading.Thread(target=scan_background_loop, daemon=True)
    t.start()
