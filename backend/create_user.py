import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import Session, select
from app.db.session import engine
from app.db.models import User
from app.core.security import get_password_hash

def create_user(username, password):
    with Session(engine) as session:
        existing = session.exec(select(User).where(User.username == username)).first()
        if existing:
            print(f"User '{username}' already exists.")
            return

        hashed = get_password_hash(password)
        user = User(username=username, hashed_password=hashed)
        session.add(user)
        session.commit()
        print(f"User '{username}' created successfully.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python create_user.py <username> <password>")
        print("Creating default admin/admin...")
        create_user("admin", "admin")
    else:
        create_user(sys.argv[1], sys.argv[2])
