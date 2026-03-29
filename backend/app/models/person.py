import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from .face import Face


class Person(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(default="Unknown", index=True)
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.now)

    faces: List["Face"] = Relationship(back_populates="person")
