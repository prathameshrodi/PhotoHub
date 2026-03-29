import pytest
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool
from fastapi.testclient import TestClient
import os
import sys

# Ensure backend path is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.db.session import get_session
from app.models import User
from app.core import security


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="admin_user")
def admin_user_fixture(session: Session):
    # Create admin user
    user = User(
        username="admin",
        hashed_password=security.get_password_hash("password"),
        is_admin=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="normal_user")
def normal_user_fixture(session: Session):
    # Create normal user
    user = User(
        username="user",
        hashed_password=security.get_password_hash("password"),
        is_admin=False,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="admin_token")
def admin_token_fixture(admin_user):
    return security.create_access_token(admin_user.id)


@pytest.fixture(name="normal_token")
def normal_token_fixture(normal_user):
    return security.create_access_token(normal_user.id)
