import datetime
import json
import logging
from typing import List, Optional, Dict, Any

from sqlmodel import Session, select, func, or_
from sqlalchemy.sql.expression import text

from app.models import Image, User

logger = logging.getLogger("backend")

class ImageService:
    @staticmethod
    def get_images(
        session: Session, 
        user: User, 
        offset: int = 0, 
        limit: int = 100, 
        sort_order: str = 'desc', 
        location: Optional[str] = None
    ) -> List[Image]:
        query = select(Image).where(Image.is_deleted == False)
        
        # Permission Check
        if not user.is_admin:
            if not user.allowed_paths:
                 return [] 
            try:
                allowed = json.loads(user.allowed_paths)
                if not allowed:
                    return []
                conditions = [Image.path.startswith(p) for p in allowed]
                query = query.where(or_(*conditions))
            except:
                 return []

        if location:
            query = query.where(Image.location == location)

        # Sorting
        if sort_order == 'asc':
            query = query.order_by(Image.capture_date.asc(), Image.timestamp.asc())
        else:
            query = query.order_by(Image.capture_date.desc(), Image.timestamp.desc())

        return session.exec(query.offset(offset).limit(limit)).all()

    @staticmethod
    def get_timeline(session: Session) -> List[str]:
        # DB Agnostic approach: Select distinct year, month
        date_col = func.coalesce(Image.capture_date, Image.timestamp)
        
        # SQLModel/SQLAlchemy extract works on both Postgres and SQLite usually
        statement = select(
            func.extract('year', date_col).label('year'), 
            func.extract('month', date_col).label('month')
        ).where(Image.is_deleted == False).distinct().order_by(
            func.extract('year', date_col).desc(), 
            func.extract('month', date_col).desc()
        )
        
        results = session.exec(statement).all()
        
        formatted_timeline = []
        for year, month in results:
            if not year or not month: continue
            try:
                # Year/Month might be float in some DBs when extracted
                date_obj = datetime.date(int(year), int(month), 1)
                formatted_timeline.append(date_obj.strftime('%B %Y'))
            except Exception as e:
                logger.warning(f"Error formatting date {year}-{month}: {e}")
                continue
                
        return formatted_timeline

    @staticmethod
    def get_date_offset(
        session: Session, 
        user: User, 
        date_str: str, 
        sort_order: str = 'desc'
    ) -> int:
        try:
            # Simple parsing. If length is 7 (YYYY-MM), treat as month boundary.
            if len(date_str) == 7:
                year, month = map(int, date_str.split('-'))
                if sort_order == 'desc':
                    if month == 12:
                        target_date = datetime.datetime(year + 1, 1, 1) - datetime.timedelta(seconds=1)
                    else:
                        target_date = datetime.datetime(year, month + 1, 1) - datetime.timedelta(seconds=1)
                else:
                    target_date = datetime.datetime(year, month, 1)
            else:
                 target_date = datetime.datetime.fromisoformat(date_str)
        except ValueError:
            raise ValueError("Invalid date format")

        query = select(func.count(Image.id)).where(Image.is_deleted == False)
        
        # Permission Check
        if not user.is_admin:
            if not user.allowed_paths:
                 return 0
            try:
                allowed = json.loads(user.allowed_paths)
                if allowed:
                    conditions = [Image.path.startswith(p) for p in allowed]
                    query = query.where(or_(*conditions))
            except:
                 return 0

        date_col = func.coalesce(Image.capture_date, Image.timestamp)

        if sort_order == 'asc':
            query = query.where(date_col < target_date)
        else:
            query = query.where(date_col > target_date)

        return session.exec(query).one()
