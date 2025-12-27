from sqlmodel import Session, select, create_engine
from models import Image
import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

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

with Session(engine) as session:
    heic_images = session.exec(select(Image).where(Image.path.ilike('%.heic'))).all()
    print(f"Found {len(heic_images)} HEIC images in database.")
    if heic_images:
        print(f"Sample path: {heic_images[0].path}")
        
    all_images = session.exec(select(Image)).all()
    print(f"Total images in database: {len(all_images)}")

# Check if pillow-heif is working
try:
    from pillow_heif import register_heif_opener
    print("pillow-heif is installed and importable.")
except ImportError:
    print("pillow-heif is NOT installed.")
