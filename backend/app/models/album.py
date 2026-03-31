import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from .image import Image


class AlbumImageLink(SQLModel, table=True):
    album_id: Optional[int] = Field(default=None, foreign_key="album.id", primary_key=True)
    image_id: Optional[int] = Field(default=None, foreign_key="image.id", primary_key=True)
    is_deleted: bool = Field(default=False)


class AlbumBase(SQLModel):
    name: str
    description: Optional[str] = None
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.now)


class Album(AlbumBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    cover_image_id: Optional[int] = Field(default=None, foreign_key="image.id")
    
    is_deleted: bool = Field(default=False)
    images: List["Image"] = Relationship(link_model=AlbumImageLink)


class AlbumRead(AlbumBase):
    id: int
    cover_image_id: Optional[int]
    image_count: int = 0
