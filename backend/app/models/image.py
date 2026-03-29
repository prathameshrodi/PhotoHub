import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from .face import Face


class Image(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    path: str = Field(unique=True, index=True)
    filename: str
    timestamp: datetime.datetime = Field(default_factory=datetime.datetime.now)
    thumbnail: Optional[str] = Field(default=None)  # Base64 encoded thumbnail
    # Metadata Fields
    capture_date: Optional[datetime.datetime] = Field(default=None)
    location: Optional[str] = Field(default=None)  # "City, Country"
    latitude: Optional[float] = Field(default=None)
    longitude: Optional[float] = Field(default=None)
    format: Optional[str] = Field(default=None)  # "JPEG", "HEIC"

    faces: List["Face"] = Relationship(back_populates="image")
