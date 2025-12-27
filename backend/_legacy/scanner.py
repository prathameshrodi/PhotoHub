import os
import json
import logging
import numpy as np
from sqlmodel import Session, select
from models import Image, Person, Face
from database import engine
import io
import base64
from PIL import Image as PILImage
from pillow_heif import register_heif_opener
register_heif_opener()

try:
    import face_recognition
    FACE_REC_AVAILABLE = True
except ImportError:
    FACE_REC_AVAILABLE = False
    logging.warning("face_recognition not installed. Skipping face detection.")

from pillow_heif import register_heif_opener
register_heif_opener()

logger = logging.getLogger("backend")

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG', '.heic', '.HEIC', '.heif'}
TOLERANCE = 0.6  # Lower is stricter

def scan_directory(root_dir: str):
    logger.info(f"Scanning {root_dir}...")
    
    found_files = []
    with Session(engine) as session:
        # Define base64 prefix
        PREFIX = "data:image/jpeg;base64,"

        # 1. Collect all valid image paths
        for root, dirs, files in os.walk(root_dir):
            for file in files:
                if file.startswith("._"): # Skip macOS metadata files
                    continue
                if os.path.splitext(file)[1].lower() in ALLOWED_EXTENSIONS:
                    full_path = os.path.join(root, file)
                    found_files.append(full_path)
        
        # 2. Check which ones are already in DB
        # Optimization: Fetch paths AND their thumbnail status to decide if we need to update them
        logging.info("Checking existing images...")
        existing_images = session.exec(select(Image)).all()
        existing_map = {img.path: img for img in existing_images}
        
        # 3. Filter new files
        new_files = [f for f in found_files if f not in existing_map]
        
        # 3.5 Backfill Thumbnails for existing images
        updates_count = 0
        for path, img in existing_map.items():
            if not img.thumbnail:
                try:
                    thumb = generate_thumbnail(path)
                    if thumb:
                        img.thumbnail = PREFIX + thumb
                        session.add(img)
                        updates_count += 1
                except Exception as e:
                    logger.error(f"Failed to backfill thumbnail for {path}: {e}")
        
        if updates_count > 0:
            logger.info(f"Backfilling thumbnails for {updates_count} existing images...")
            session.commit()

        if not new_files:
            logger.info("No new images found.")
            print("Scan complete. No new images.")
            # Still might have done backfills
            return

        logger.info(f"Found {len(new_files)} new images to add.")
        
        # 4. Process New Images (Insert + Thumbnail)
        new_image_objects = []
        for p in new_files:
            img = Image(path=p, filename=os.path.basename(p))
            try:
                thumb = generate_thumbnail(p)
                if thumb:
                    img.thumbnail = PREFIX + thumb
            except Exception as e:
                logger.error(f"Failed to generate thumbnail for {p}: {e}")
            new_image_objects.append(img)

        # Bulk save
        session.add_all(new_image_objects)
        session.commit()
        
        # 5. Process Faces for new images
        # Refresh to get IDs
        # To strictly match objects to IDs for face rec, we might need to re-select them or use return_defaults (not typically supported in simple bulk)
        # Iterating over them *after* commit *should* refresh them in SQLModel/SQLAlchemy 1.4+
        
        for img_obj in new_image_objects:
             # Ensure ID is available
             process_face_recognition(session, img_obj)
            
    print("Scan complete.")

def generate_thumbnail(file_path: str, max_size=(300, 300)) -> str:
    try:
        with PILImage.open(file_path) as img:
            # Convert to RGB if needed (e.g. RGBA or HEIC)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            img.thumbnail(max_size)
            buffered = io.BytesIO()
            img.save(buffered, format="JPEG", quality=70) # Lower quality for speed/size
            return base64.b64encode(buffered.getvalue()).decode('utf-8')
    except Exception as e:
        logger.warning(f"Thumbnail generation failed for {file_path}: {e}")
        return None
            
    print("Scan complete.")
    
def process_face_recognition(session: Session, db_image: Image):
    if not FACE_REC_AVAILABLE:
        return

    try:
        # Load image
        image_data = face_recognition.load_image_file(db_image.path)
        
        # Find faces
        face_locations = face_recognition.face_locations(image_data)
        face_encodings = face_recognition.face_encodings(image_data, face_locations)

        for encoding in face_encodings:
            register_face(session, db_image, encoding)
                
    except Exception as e:
        logger.error(f"Error processing faces for {db_image.path}: {e}")


def register_face(session: Session, db_image: Image, encoding: np.ndarray):
    # Convert encoding to list for easy handling, usually we store as bytes or heavy string
    # For simplicity, let's use a very basic matching strategy against existing people
    
    # Get all known people and their representative encodings
    # This is O(N) where N is number of people. For large sets, utilize a vector DB or optimized structure.
    people = session.exec(select(Person)).all()
    
    match_found = False
    
    for person in people:
        # We need to get a representative encoding. 
        # For now, let's just grab the first face's encoding of that person.
        # Ideally, we average them or keep a centroid.
        if person.faces:
            # Decode the first face's encoding
            known_encoding = np.array(json.loads(person.faces[0].encoding))
            match = face_recognition.compare_faces([known_encoding], encoding, tolerance=TOLERANCE)
            if match[0]:
                assign_face_to_person(session, db_image, person, encoding)
                match_found = True
                break
    
    if not match_found:
        # Create new person
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
