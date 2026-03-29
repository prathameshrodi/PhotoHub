from fastapi import APIRouter, Depends
from typing import List, Optional
from sqlmodel import Session, select, func
from app.db.session import engine
from app.models import Image
from app.core.security import get_current_user, User
from pydantic import BaseModel
import base64
import io
import os
from PIL import Image as PILImage

router = APIRouter()


class LocationRead(BaseModel):
    name: str
    count: int
    cover_photo: Optional[str] = None


@router.get("/", response_model=List[LocationRead])
def get_locations(current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        # Group by location, count images, and pick one image for cover
        # SQLModel doesn't support easy Group By with aggregations in a single model select usually
        # using underlying sqlalchemy logic

        # We want: SELECT location, COUNT(*), MIN(id) FROM image WHERE location IS NOT NULL GROUP BY location

        # Note: thumbnail might be too large for aggregation, usually we get ID and construct URL.
        statement = (
            select(
                Image.location,
                func.count(Image.id).label("count"),
                func.min(Image.id).label("cover_id"),  # Naive cover selection
            )
            .where(Image.location != None)
            .group_by(Image.location)
        )

        results = session.exec(statement).all()

        # 1. Collect all cover_ids
        cover_ids = [r.cover_id for r in results if r.cover_id]

        # 2. Batch fetch Image objects
        image_map = {}
        if cover_ids:
            # select(Image) where id in cover_ids
            img_stmt = select(Image).where(Image.id.in_(cover_ids))
            images = session.exec(img_stmt).all()
            for img in images:
                image_map[img.id] = img

        locations = []
        for loc, count, cover_id in results:
            cover = None
            if cover_id in image_map:
                img_obj = image_map[cover_id]

                # Case 1: Database has thumbnail
                if img_obj.thumbnail:
                    cover = img_obj.thumbnail

                # Case 2: On-the-fly generation from path
                elif img_obj.path and os.path.exists(img_obj.path):
                    try:
                        with PILImage.open(img_obj.path) as img:
                            # Resize to thumbnail size (e.g. 300x300 or similar aspect)
                            img.thumbnail((400, 400))  # Reasonable size for cover

                            buffer = io.BytesIO()
                            # Convert to RGB if necessary (e.g. RGBA/P)
                            if img.mode in ("RGBA", "P"):
                                img = img.convert("RGB")

                            img.save(buffer, format="JPEG", quality=70)
                            img_str = base64.b64encode(buffer.getvalue()).decode(
                                "utf-8"
                            )
                            cover = f"data:image/jpeg;base64,{img_str}"
                    except Exception as e:
                        print(f"Failed to generate thumbnail for {img_obj.path}: {e}")

            # Fallback if generation failed or file missing
            if not cover and cover_id:
                cover = f"/images/content/{cover_id}"

            locations.append(LocationRead(name=loc, count=count, cover_photo=cover))

        return locations
