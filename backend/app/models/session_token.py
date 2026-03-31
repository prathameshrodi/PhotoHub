import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class SessionToken(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(index=True)
    user_id: int = Field(foreign_key="app_users.id")
    expires_at: datetime.datetime
    is_deleted: bool = Field(default=False)
