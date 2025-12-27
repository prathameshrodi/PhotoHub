from sqlmodel import Session, select, create_engine
from models import Image
import os
from dotenv import load_dotenv
from urllib.parse import quote_plus
from sqlalchemy import text

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
    # Check if column exists
    try:
        session.exec(text("SELECT thumbnail FROM image LIMIT 1"))
        print("Column 'thumbnail' exists.")
    except Exception as e:
        print(f"Column 'thumbnail' MISSING: {e}")
        exit()

    # Check count
    images_with_thumb = session.exec(select(Image).where(Image.thumbnail != None)).all()
    print(f"Images with thumbnail: {len(images_with_thumb)}")
    
    total_images = session.exec(select(Image)).all()
    print(f"Total images: {len(total_images)}")
    
    if images_with_thumb:
        print(f"Sample thumbnail length: {len(images_with_thumb[0].thumbnail)}")
        print(f"Sample thumbnail start: {images_with_thumb[0].thumbnail[:30]}...")
