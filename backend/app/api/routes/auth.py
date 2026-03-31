from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.db.session import get_session
from app.models import User, SessionToken
from app.core import security
from app.core.config import settings

router = APIRouter()


class UserCreate(BaseModel):
    username: str
    password: str


@router.post("/signup")
def signup(user: UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.username == user.username, User.is_deleted == False)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")

    # Check if this is the first user
    user_count = session.exec(select(User).where(User.is_deleted == False)).all()
    is_first = len(user_count) == 0

    hashed_password = security.get_password_hash(user.password)
    new_user = User(
        username=user.username, hashed_password=hashed_password, is_admin=is_first
    )
    session.add(new_user)
    session.commit()
    return {"status": "User created", "is_admin": is_first}


@router.post("/token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    user = session.exec(select(User).where(User.username == form_data.username, User.is_deleted == False)).first()
    if not user or not security.verify_password(
        form_data.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )

    # Store session
    session_token = SessionToken(
        token=access_token,
        user_id=user.id,
        expires_at=datetime.utcnow() + access_token_expires,
    )
    session.add(session_token)
    session.commit()

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
def logout(
    token: str = Depends(security.oauth2_scheme),
    session: Session = Depends(get_session),
):
    statement = select(SessionToken).where(SessionToken.token == token, SessionToken.is_deleted == False)
    results = session.exec(statement)
    for res in results:
        res.is_deleted = True
        session.add(res)
    session.commit()
    return {"status": "logged_out"}
