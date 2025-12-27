from sqlmodel import create_engine, Session, SQLModel
from sqlalchemy import inspect, text
import os
from urllib.parse import quote_plus
from dotenv import load_dotenv
import logging

load_dotenv()

# Database setup
postgres_user = os.getenv("POSTGRES_USER", "postgres")
postgres_password = os.getenv("POSTGRES_PASSWORD", "password")
postgres_server = os.getenv("POSTGRES_SERVER", "localhost")
postgres_port = os.getenv("POSTGRES_PORT", "5432")
postgres_db = os.getenv("POSTGRES_DB", "photoviewer")

# URL-encode the user and password
encoded_user = quote_plus(postgres_user)
encoded_password = quote_plus(postgres_password)

database_url = f"postgresql://{encoded_user}:{encoded_password}@{postgres_server}:{postgres_port}/{postgres_db}"

engine = create_engine(database_url)
logger = logging.getLogger("backend")

def init_db():
    try:
        # Import models to ensure they are registered with SQLModel
        from app.db import models
        
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        # Simple migration check for new columns (if not wiping)
        if "image" in existing_tables:
            columns = [col["name"] for col in inspector.get_columns("image")]
            if "capture_date" not in columns:
                logger.info("Adding new metadata columns to Image table")
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE image ADD COLUMN capture_date TIMESTAMP"))
                    conn.execute(text("ALTER TABLE image ADD COLUMN location TEXT"))
                    conn.execute(text("ALTER TABLE image ADD COLUMN latitude FLOAT"))
                    conn.execute(text("ALTER TABLE image ADD COLUMN longitude FLOAT"))
                    conn.execute(text("ALTER TABLE image ADD COLUMN format TEXT"))
                    conn.commit()

        SQLModel.metadata.create_all(engine)
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise e

def get_session():
    with Session(engine) as session:
        yield session
