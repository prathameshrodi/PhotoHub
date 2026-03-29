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

from sqlmodel import Session, select
from app.models import Image, Person, Face
from app.db.session import engine
from app.services import metadata
from app.core import config

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

def generate_thumbnail(file_path: str, max_size=(300, 300)) -> Optional[str]:
    try:
        with PILImage.open(file_path) as img:
            if img.mode != "RGB":
                img = img.convert("RGB")
            img.thumbnail(max_size)
            buffered = io.BytesIO()
            img.save(buffered, format="JPEG", quality=70)
            return base64.b64encode(buffered.getvalue()).decode("utf-8")
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

# --- WORKER FUNCTION (Must be top level) ---
def process_image_task(file_path: str) -> Dict[str, Any]:
    """
    Worker function to process a single image.
    Returns a dictionary of result data to be saved to DB by the main process.
    """
    result = {
        "path": file_path,
        "filename": os.path.basename(file_path),
        "status": "failed",
        "error": None,
        "thumbnail": None,
        "metadata": {},
        "face_encodings": []
    }

    try:
        # 1. Extract Metadata
        meta = metadata.extract_metadata(file_path)

        # 2. Resolve Location
        location_name = resolve_location(meta.get("latitude"), meta.get("longitude"))
        meta["location"] = location_name
        result["metadata"] = meta

        # 3. Generate Thumbnail (Deferred to API / Redis Cache)
        result["thumbnail"] = None

        # 4. Face Recognition (CPU Heavy)
        result["face_encodings"] = get_face_encodings(file_path)

        result["status"] = "success"
    except Exception as e:
        result["error"] = str(e)
        # traceback.print_exc()

    return result

from celery import shared_task

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
        existing_images = session.exec(select(Image)).all()
        existing_map = {img.path: img for img in existing_images}

        # Backfill Thumbnails logic could go here (omitted for speed optimization focus of new files)

    new_files = [f for f in found_files if f not in existing_map]

    if not new_files:
        logger.info("No new images to process.")
        return

    logger.info(f"Found {len(new_files)} new images. Starting parallel processing...")

    # 3. Sequential Processing (1 photo at a time)
    BATCH_SIZE = 10
    batch_images = []
    batch_results = []

    total_processed = 0

    with Session(engine) as session:
        for file_path in new_files:
            try:
                data = process_image_task(file_path)
                if data["status"] == "success":
                    meta = data["metadata"]
                    img = Image(
                        path=data["path"],
                        filename=data["filename"],
                        capture_date=meta.get("capture_date"),
                        latitude=meta.get("latitude"),
                        longitude=meta.get("longitude"),
                        format=meta.get("format"),
                        location=meta.get("location"),
                        thumbnail=data.get("thumbnail")
                    )
                    logger.info(f"Processing Image {data.get('filename', 'No Image')}")

                    batch_images.append(img)
                    batch_results.append(data) # Keep data to process faces after image has ID
                else:
                    logger.error(f"Failed to process {file_path}: {data.get('error')}")

            except Exception as e:
                logger.error(f"Worker exception for {file_path}: {e}")

            # Batch Commit
            if len(batch_images) >= BATCH_SIZE:
                logger.info("Saving to DB...")
                save_batch(session, batch_images, batch_results)
                total_processed += len(batch_images)
                logger.info(f"Processed {total_processed}/{len(new_files)} images...")
                batch_images = []
                batch_results = []

        # Final Batch
        if batch_images:
            save_batch(session, batch_images, batch_results)
            total_processed += len(batch_images)

    logger.info(f"Scan complete. Processed {total_processed} new images.")

def save_batch(session: Session, images: List[Image], results: List[Dict]):
    """
    Saves a batch of images and processes their faces sequentially.
    """
    # 1. Add Images and Commit to get IDs
    session.add_all(images)
    session.commit()

    # 2. Refresh images to get IDs and Process Faces
    for img, res in zip(images, results):
        session.refresh(img)
        encodings = res.get("face_encodings", [])
        if encodings:
            register_faces_for_image(session, img, encodings)

    # 3. Final commit for faces (register_faces_for_image commits internally but good practice)
    # Actually register_faces_for_image handles its own commits/logic to be safe with Person creation
    pass

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

# --- BACKGROUND SCANNER ---
import threading
import time

def scan_background_loop():
    logger.info("Starting background scan loop...")
    photos_dir = os.environ.get("PHOTOS_DIR")
    if not photos_dir:
        logger.error("PHOTOS_DIR not set. Background scanner stopped.")
        return

    # Handle multiple paths
    paths = [p.strip() for p in photos_dir.split(";") if p.strip()]
    if not paths:
        logger.error("No valid paths in PHOTOS_DIR.")
        return

    while True:
        try:
            for path in paths:
                if os.path.exists(path):
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
