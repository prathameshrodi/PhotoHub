from sqlmodel import Session, select, create_engine
from models import Image
import os
from dotenv import load_dotenv
from urllib.parse import quote_plus
import io
import base64
from PIL import Image as PILImage
from pillow_heif import register_heif_opener
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backfill")

register_heif_opener()

load_dotenv()

postgres_user = os.getenv("POSTGRES_USER", "postgres")
postgres_password = os.getenv("POSTGRES_PASSWORD", "password")
postgres_server = os.getenv("POSTGRES_SERVER", "localhost")
postgres_port = os.getenv("POSTGRES_PORT", "5432")
postgres_db = os.getenv("POSTGRES_DB", "photoviewer")

encoded_user = quote_plus(postgres_user)
encoded_password = quote_plus(postgres_password)

database_url = f"postgresql://{encoded_user}:{encoded_password}@{postgres_server}:{postgres_port}/{postgres_db}"
engine = create_engine(database_url)

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

def backfill_thumbnails():
    PREFIX = "data:image/jpeg;base64,"
    with Session(engine) as session:
        images = session.exec(select(Image).where(Image.thumbnail == None)).all()
        logger.info(f"Found {len(images)} images missing thumbnails.")
        
        count = 0
        for img in images:
            if not os.path.exists(img.path):
                continue
                
            thumb = generate_thumbnail(img.path)
            if thumb:
                img.thumbnail = PREFIX + thumb
                session.add(img)
                count += 1
                
            if count % 50 == 0:
                session.commit()
                print(f"Processed {count}...")
        
        session.commit()
        logger.info(f"Completed. Backfilled {count} thumbnails.")

if __name__ == "__main__":
    backfill_thumbnails()
