import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Column, LargeBinary
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from .face import Face


class ImageBase(SQLModel):
    path: str = Field(unique=True, index=True)
    filename: str
    timestamp: datetime.datetime = Field(default_factory=datetime.datetime.now)
    # Metadata Fields
    capture_date: Optional[datetime.datetime] = Field(default=None)
    location: Optional[str] = Field(default=None)  # "City, Country"
    latitude: Optional[float] = Field(default=None)
    longitude: Optional[float] = Field(default=None)
    format: Optional[str] = Field(default=None)  # "JPEG", "HEIC"


class Image(ImageBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    thumbnail: Optional[bytes] = Field(default=None, sa_column=Column(LargeBinary))  # Binary thumbnail data

    faces: List["Face"] = Relationship(back_populates="image")


class ImageRead(ImageBase):
    id: int
