import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship

class Person(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(default="Unknown", index=True)
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.now)

    faces: List["Face"] = Relationship(back_populates="person")

class Image(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    path: str = Field(unique=True, index=True)
    filename: str
    timestamp: datetime.datetime = Field(default_factory=datetime.datetime.now)
    thumbnail: Optional[str] = Field(default=None) # Base64 encoded thumbnail
    
    faces: List["Face"] = Relationship(back_populates="image")

class Face(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    encoding: str  # Store as JSON string or bytes? JSON string of list[float] is easier for sqlite
    
    image_id: Optional[int] = Field(default=None, foreign_key="image.id")
    image: Optional[Image] = Relationship(back_populates="faces")
    
    person_id: Optional[int] = Field(default=None, foreign_key="person.id")
    person: Optional[Person] = Relationship(back_populates="faces")

class User(SQLModel, table=True):
    __tablename__ = "app_users"
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    hashed_password: str
    is_admin: bool = Field(default=False)
    allowed_paths: Optional[str] = Field(default=None) # JSON list of paths

class SessionToken(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(index=True)
    user_id: int = Field(foreign_key="app_users.id")
    expires_at: datetime.datetime
