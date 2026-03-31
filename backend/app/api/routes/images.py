from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlmodel import Session
from typing import List, Optional
import os
import io
import logging
from PIL import Image as PILImage
import mimetypes
from app.db.session import get_session
from app.models import Image, ImageRead, User
from app.core import security
from app.services.image_service import ImageService

logger = logging.getLogger("backend")
router = APIRouter()


@router.get("/", response_model=List[ImageRead])
def read_images(
    offset: int = 0,
    limit: int = 100,
    sort_order: str = "desc",
    location: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(security.get_current_user),
):
    return ImageService.get_images(
        session, current_user, offset, limit, sort_order, location
    )


@router.get("/timeline")
def get_timeline(session: Session = Depends(get_session)):
    # Note: Logic moved to service
    return ImageService.get_timeline(session)


@router.get("/date-offset")
def get_date_offset(
    date: str,
    sort_order: str = "desc",
    session: Session = Depends(get_session),
    current_user: User = Depends(security.get_current_user),
):
    try:
        offset = ImageService.get_date_offset(session, current_user, date, sort_order)
        return {"offset": offset}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/content/{image_id}")
def get_image_content(image_id: int, session: Session = Depends(get_session)):
    image = session.get(Image, image_id)
    if not image or image.is_deleted or not os.path.exists(image.path):
        raise HTTPException(status_code=404, detail="Image file not found on disk")

    # Handle HEIC Conversion
    if image.path.lower().endswith((".heic", ".heif")):
        try:
            img = PILImage.open(image.path)
            img_io = io.BytesIO()
            img.convert("RGB").save(img_io, "JPEG", quality=80)
            img_io.seek(0)
            return StreamingResponse(img_io, media_type="image/jpeg")
        except Exception as e:
            logger.error(f"Conversion failed: {e}")
            raise HTTPException(status_code=500, detail="Could not process image format")

    # Standard Images: Let mimetypes handle the type
    mime_type, _ = mimetypes.guess_type(image.path)
    return FileResponse(image.path, media_type=mime_type)

from fastapi.responses import Response
from app.core.cache import get_redis_client

@router.get("/thumbnail/{image_id}")
def get_image_thumbnail(
    image_id: int, 
    session: Session = Depends(get_session),
    redis_client = Depends(get_redis_client)
):
    # Check cache first
    cache_key = f"thumb:{image_id}"
    cached_thumb = redis_client.get(cache_key)
    if cached_thumb:
        return Response(content=cached_thumb, media_type="image/jpeg")
        
    image = session.get(Image, image_id)
    if not image or image.is_deleted or not os.path.exists(image.path or ""):
        raise HTTPException(status_code=404, detail="Image not found")
        
    # If thumbnail exists in DB, cache it and return it
    if image.thumbnail:
        redis_client.set(cache_key, image.thumbnail, ex=86400 * 30) # 30 days cache
        return Response(content=image.thumbnail, media_type="image/jpeg")

    try:
        # Fallback to generating thumbnail if not in DB
        with PILImage.open(image.path) as img:
            if img.mode != "RGB":
                img = img.convert("RGB")
            img.thumbnail((300, 300))
            buffered = io.BytesIO()
            img.save(buffered, format="JPEG", quality=70)
            thumb_bytes = buffered.getvalue()
            
            # Save to DB for next time
            image.thumbnail = thumb_bytes
            session.add(image)
            session.commit()
            
            # Cache it
            redis_client.set(cache_key, thumb_bytes, ex=86400 * 30)
            
            return Response(content=thumb_bytes, media_type="image/jpeg")
    except Exception as e:
        logger.error(f"Error generating thumbnail for {image.path}: {e}")
        # fallback to returning original image if generation fails
        return FileResponse(image.path)
