from sqlmodel import create_engine, Session, SQLModel
from sqlalchemy import inspect
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

def create_db_and_tables():
    try:
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        # Check if our core tables exist
        if "image" in existing_tables and "person" in existing_tables:
            # Check for migration (add thumbnail column if missing)
            from sqlalchemy import text
            try:
                # Try to select the column to see if it exists
                with engine.connect() as conn:
                    conn.execute(text("SELECT thumbnail FROM image LIMIT 1"))
            except Exception:
                logger.info("Migrating database: Adding 'thumbnail' column to 'image' table.")
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE image ADD COLUMN thumbnail TEXT"))
                    conn.commit()

            # Check for User table migrations
            if "app_users" in existing_tables:
                try:
                    with engine.connect() as conn:
                        conn.execute(text("SELECT is_admin FROM app_users LIMIT 1"))
                except Exception:
                    logger.info("Migrating database: Adding 'is_admin' and 'allowed_paths' to 'app_users' table.")
                    with engine.connect() as conn:
                        conn.execute(text("ALTER TABLE app_users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE"))
                        conn.execute(text("ALTER TABLE app_users ADD COLUMN allowed_paths TEXT"))
                        conn.commit()

        # Always run create_all to create any missing tables (like app_users)
        SQLModel.metadata.create_all(engine)
        logger.info("Database tables verified/created successfully.")
    except Exception as e:
        logger.error(f"Failed to create/verify database tables: {e}")
        # Re-raising to ensure application startup fails if DB is inaccessible
        raise e

def get_session():
    with Session(engine) as session:
        yield session
