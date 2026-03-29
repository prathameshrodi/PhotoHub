from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from .image import Image
    from .person import Person


class Face(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    encoding: str  # JSON string of list[float]

    image_id: Optional[int] = Field(default=None, foreign_key="image.id")
    image: Optional["Image"] = Relationship(back_populates="faces")

    person_id: Optional[int] = Field(default=None, foreign_key="person.id")
    person: Optional["Person"] = Relationship(back_populates="faces")
