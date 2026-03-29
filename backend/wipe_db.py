import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import SQLModel
from app.db.session import engine
from app.models import Image, Person, Face, User, SessionToken

def wipe_database():
    print("Dropping all tables...")
    SQLModel.metadata.drop_all(engine)
    print("All tables dropped. Database is clean.")

if __name__ == "__main__":
    wipe_database()
