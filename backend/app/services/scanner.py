import os
import json
import logging
import numpy as np
import io
import base64
import multiprocessing
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Optional
from celery import shared_task

from sqlmodel import Session, select
from app.models import Image, Person, Face
from app.db.session import engine
from app.services import metadata
from app.core import config
import os

from PIL import Image as PILImage
from pillow_heif import register_heif_opener

register_heif_opener()

# Setup Scanner Logger
logger = logging.getLogger("scanner")
logger.setLevel(logging.INFO)
scanner_handler = logging.FileHandler(
    os.path.join(config.settings.LOG_DIR, "scanner.log")
)
scanner_handler.setFormatter(
    logging.Formatter("%(asctime)s - SCANNER - %(levelname)s - %(message)s")
)
logger.addHandler(scanner_handler)

DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Global availabilities for WORKER Check
try:
    import face_recognition
    FACE_REC_AVAILABLE = True
except ImportError:
    FACE_REC_AVAILABLE = False
    logger.warning("face_recognition not installed. Skipping face detection.")
except Exception as e:
    import traceback
    traceback.print_exc()
    logger.error(f"{e}")

try:
    import reverse_geocoder as rg
    RG_AVAILABLE = True
except ImportError:
    RG_AVAILABLE = False
    logger.warning("reverse_geocoder not installed. Location names will be missing.")

# Initialize thread-unsafe or high-overhead models once globally
if RG_AVAILABLE:
    try:
        rg.search((37.7749, -122.4194), mode=1)
    except Exception:
        pass

if FACE_REC_AVAILABLE:
    try:
        _dummy = np.zeros((10, 10, 3), dtype=np.uint8)
        face_recognition.face_locations(_dummy, model="hog")
    except Exception:
        pass

ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG", ".heic", ".HEIC", ".heif"
}
TOLERANCE = 0.6
PREFIX = "data:image/jpeg;base64,"

def generate_thumbnail(file_path: str, max_size=(300, 300)) -> Optional[bytes]:
    try:
        with PILImage.open(file_path) as img:
            if img.mode != "RGB":
                img = img.convert("RGB")
            img.thumbnail(max_size)
            buffered = io.BytesIO()
            img.save(buffered, format="JPEG", quality=70)
            return buffered.getvalue()
    except Exception as e:
        # Worker logger might not flush to main log easily, print is safer for debug if needed
        return None

def resolve_location(lat, lon):
    if not RG_AVAILABLE or lat is None or lon is None:
        return None
    try:
        # Suppress RG print output if possible, it can be noisy
        results = rg.search((lat, lon), mode=1) # mode=1 single threaded usually safer inside processes? or mode=2
        if results:
            return f"{results[0]['name']}, {results[0]['cc']}"
    except Exception:
        pass
    return None

def get_face_encodings(file_path: str) -> List[List[float]]:
    if not FACE_REC_AVAILABLE:
        return []
    try:
        image_data = face_recognition.load_image_file(file_path)
        # HOG is faster than CNN. If users want CNN we can config later.
        face_locations = face_recognition.face_locations(image_data, model="hog")
        encodings = face_recognition.face_encodings(image_data, face_locations)
        return [enc.tolist() for enc in encodings]
    except Exception:
        return []

# --- WORKER FUNCTIONS (Must be top level) ---

# --- WORKER FUNCTIONS (Must be top level) ---

@shared_task(name="process_thumbnail_task")
def process_thumbnail_task(batch_size: int = 200):
    with Session(engine) as session:
        # Get a batch of images that haven't been processed for thumbnails
        images = session.exec(
            select(Image)
            .where(Image.thumbnail_processed == False)
            .order_by(Image.Id)
            .limit(batch_size)
        ).all()

        if not images:
            return

        for index, image in enumerate(images):
            try:
                thumbnail_data = generate_thumbnail(image.path)
                if thumbnail_data:
                    image.thumbnail = thumbnail_data
                image.thumbnail_processed = True
                check_all_processed(session, image)
                session.add(image)
                logger.info(f"Thumbnail processed for image ID {image.id}")
                if index % batch_size == 0:
                    session.commit()
            except Exception as e:
                logger.error(f"Error processing thumbnail for {image.id}: {e}")

@shared_task(name="process_location_task")
def process_location_task(batch_size: int = 200):
    with Session(engine) as session:
        # Get a batch of images that haven't been processed for location
        images = session.exec(
            select(Image)
            .where(Image.location_processed == False)
            .order_by(Image.Id)
            .limit(batch_size)
        ).all()

        if not images:
            return

        for index, image in enumerate(images):
            try:
                if image.latitude is not None and image.longitude is not None:
                    location_name = resolve_location(image.latitude, image.longitude)
                    if location_name:
                        image.location = location_name
                image.location_processed = True
                check_all_processed(session, image)
                session.add(image)
                logger.info(f"Location resolved for image ID {image.id}")
                if index % batch_size == 0:
                    session.commit()
            except Exception as e:
                logger.error(f"Error processing location for {image.id}: {e}")

@shared_task(name="process_faces_task")
def process_faces_task(batch_size: int = 100):
    with Session(engine) as session:
        # Get a batch of images that haven't been processed for faces
        images = session.exec(
            select(Image)
            .where(Image.faces_processed == False)
            .order_by(Image.Id)
            .limit(batch_size)
        ).all()

        if not images:
            return

        for index, image in enumerate(images):
            try:
                encodings = get_face_encodings(image.path)
                if encodings:
                    register_faces_for_image(session, image, encodings)
                image.faces_processed = True
                check_all_processed(session, image)
                session.add(image)
                logger.info(f"Faces processed for image ID {image.id}")
                if index % batch_size == 0:
                    session.commit()
            except Exception as e:
                logger.error(f"Error processing faces for {image.id}: {e}")

def check_all_processed(session, image: Image):
    if image.thumbnail_processed and image.location_processed and image.faces_processed:
        image.is_processed = True


@shared_task(name="scan_all_configured_directories_task")
def scan_all_configured_directories():
    logger.info("Starting scheduled scan of all configured directories...")
    photos_dir = os.environ.get("PHOTOS_DIR") or os.environ.get("PHOTOS_DIR_ENV")
    if not photos_dir:
        logger.error("PHOTOS_DIR not set. Scheduled scan aborted.")
        return

    # Handle multiple paths
    paths = [p.strip() for p in photos_dir.split(";") if p.strip()]
    if not paths:
        logger.error("No valid paths in PHOTOS_DIR.")
        return

    for path in paths:
        if os.path.exists(path):
            # Not calling .delay() here because we want the beat worker
            # to trigger the scan and wait for it?
            # Actually, standard practice is to delay individual scans if there are many.
            scan_directory.delay(path)
        else:
            logger.warning(f"Scan path not found: {path}")

    logger.info("Scheduled scan complete.")

@shared_task(name="scan_directory_task")
def scan_directory(root_dir: str):
    logger.info(f"Scanning {root_dir}...")

    found_files = []
    # 1. Collect paths
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.startswith("._"):
                continue
            if os.path.splitext(file)[1].lower() in ALLOWED_EXTENSIONS:
                found_files.append(os.path.join(root, file))

    if not found_files:
        logger.info("No images found in directory.")
        return

    # 2. Check existing to avoid processing again
    with Session(engine) as session:
        # We only need to check if the path exists
        # Optimization: use a set of existing paths
        existing_paths = set(session.exec(select(Image.path)).all())

    new_files = [f for f in found_files if f not in existing_paths]

    if not new_files:
        logger.info("No new images to process.")
        return

    logger.info(f"Found {len(new_files)} new images. Registering...")

    # 3. Quick Registration
    total_registered = 0
    with Session(engine) as session:
        for index, file_path in enumerate(new_files):
            try:
                # 1. Extract Minimal Metadata (mostly dates)
                meta = metadata.extract_metadata(file_path)

                img = Image(
                    path=file_path,
                    filename=os.path.basename(file_path),
                    capture_date=meta.get("capture_date"),
                    latitude=meta.get("latitude"),
                    longitude=meta.get("longitude"),
                    format=meta.get("format"),
                    thumbnail_processed=False,
                    location_processed=False,
                    faces_processed=False,
                    is_processed=False,
                    is_deleted=False
                )
                session.add(img)
                total_registered += 1

                # Commit every 50 to keep it somewhat batchy but responsive
                if total_registered % 500 == 0:
                    session.commit()
                    logger.info(f"Registered {total_registered}/{len(new_files)} images...")
            except Exception as e:
                logger.error(f"Error registering {file_path}: {e}")
                session.rollback()

        session.commit() # Final commit
    logger.info(f"Scan complete. Registered {total_registered} new images for background processing.")

# Removed save_batch as logic is now handled by individual tasks

def register_faces_for_image(session: Session, db_image: Image, encodings: List[List[float]]):
    # Load all people? Or just compare?
    # Optimization: Load all people ONCE per batch?
    # But people list grows. For correctness, fetching fresh list is safer,
    # or maintaining a local cache of people in this process.

    # Since this function runs in the Main Process, we can maintain a simple cache if we want,
    # but querying is safer.

    # Get all people with faces
    # This might be slow if 1000s of people.
    # Optimization: Load all people's encodings into memory at start of scan?

    people = session.exec(select(Person)).all()

    for encoding_list in encodings:
        encoding = np.array(encoding_list)
        match_found = False

        for person in people:
            # Naive match against FIRST face of person
            # Improved: match against all? Or representative?
            # Standard face_recognition logic usually compares against a list of knowns.

            if person.faces:
                # Just check first face for performance for now
                try:
                    known_encoding = np.array(json.loads(person.faces[0].encoding))
                    match = face_recognition.compare_faces([known_encoding], encoding, tolerance=TOLERANCE)
                    if match[0]:
                        create_face(session, db_image, person, encoding)
                        match_found = True
                        break
                except:
                    continue

        if not match_found:
            new_person = Person(name=f"Person {len(people) + 1}")
            session.add(new_person)
            session.commit()
            session.refresh(new_person)
            create_face(session, db_image, new_person, encoding)
            # Add to local 'people' list so subsequent faces in this batch can match this new person
            people.append(new_person)

def create_face(session: Session, db_image: Image, person: Person, encoding: np.ndarray):
    db_face = Face(
        image_id=db_image.id,
        person_id=person.id,
        encoding=json.dumps(encoding.tolist()),
    )
    session.add(db_face)
    session.commit()

    # Update relationship locally if needed, but SQLModel relationships need refresh usually
    # Manually append to person.faces if we were using it for full matching,
    # but we only check person.faces[0] which exists for established people.
    if not person.faces:
         person.faces = [db_face]

# --- BACKGROUND SCANNER REMOVED IN FAVOR OF CELERY BEAT ---
