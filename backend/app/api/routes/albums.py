from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from pydantic import BaseModel

from app.db.session import get_session
from app.models import Album, AlbumImageLink, Image, ImageRead, AlbumRead, User
from app.core import security

router = APIRouter()

class AlbumCreate(BaseModel):
    name: str
    description: Optional[str] = None
    image_ids: List[int] = []

class AlbumUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cover_image_id: Optional[int] = None

@router.get("/", response_model=List[AlbumRead])
def read_albums(session: Session = Depends(get_session)):
    albums = session.exec(select(Album).where(Album.is_deleted == False)).all()
    results = []
    for album in albums:
        # Map manually to handle image_count
        read = AlbumRead(
            id=album.id,
            name=album.name,
            description=album.description,
            created_at=album.created_at,
            cover_image_id=album.cover_image_id,
            image_count=len([img for img in album.images if not img.is_deleted])
        )
        results.append(read)
    return results

@router.post("/", response_model=AlbumRead)
def create_album(album: AlbumCreate, session: Session = Depends(get_session)):
    db_album = Album(name=album.name, description=album.description)
    session.add(db_album)
    session.commit()
    session.refresh(db_album)
    
    # Add images
    for img_id in album.image_ids:
        link = AlbumImageLink(album_id=db_album.id, image_id=img_id)
        session.add(link)
    
    # Set first image as cover by default
    if album.image_ids and not db_album.cover_image_id:
        db_album.cover_image_id = album.image_ids[0]
        session.add(db_album)
        
    session.commit()
    session.refresh(db_album)
    
    return AlbumRead(
        id=db_album.id,
        name=db_album.name,
        description=db_album.description,
        created_at=db_album.created_at,
        cover_image_id=db_album.cover_image_id,
        image_count=len([img for img in db_album.images if not img.is_deleted])
    )

@router.get("/{album_id}", response_model=AlbumRead)
def read_album(album_id: int, session: Session = Depends(get_session)):
    album = session.get(Album, album_id)
    if not album or album.is_deleted:
        raise HTTPException(status_code=404, detail="Album not found")
    return AlbumRead(
        id=album.id,
        name=album.name,
        description=album.description,
        created_at=album.created_at,
        cover_image_id=album.cover_image_id,
        image_count=len([img for img in album.images if not img.is_deleted])
    )

@router.get("/{album_id}/images", response_model=List[ImageRead])
def read_album_images(album_id: int, session: Session = Depends(get_session)):
    album = session.get(Album, album_id)
    if not album or album.is_deleted:
        raise HTTPException(status_code=404, detail="Album not found")
    return [img for img in album.images if not img.is_deleted]

@router.post("/{album_id}/photos")
def add_photos_to_album(album_id: int, image_ids: List[int], session: Session = Depends(get_session)):
    album = session.get(Album, album_id)
    if not album or album.is_deleted:
        raise HTTPException(status_code=404, detail="Album not found")
    
    for img_id in image_ids:
        # Check if already linked
        existing = session.exec(
            select(AlbumImageLink).where(AlbumImageLink.album_id == album_id, AlbumImageLink.image_id == img_id)
        ).first()
        
        if not existing:
            link = AlbumImageLink(album_id=album_id, image_id=img_id)
            session.add(link)
    
    session.commit()
    return {"status": "success", "count": len(image_ids)}

@router.patch("/{album_id}", response_model=AlbumRead)
def update_album(album_id: int, update: AlbumUpdate, session: Session = Depends(get_session)):
    album = session.get(Album, album_id)
    if not album or album.is_deleted:
        raise HTTPException(status_code=404, detail="Album not found")
    
    if update.name is not None:
        album.name = update.name
    if update.description is not None:
        album.description = update.description
    if update.cover_image_id is not None:
        album.cover_image_id = update.cover_image_id
        
    session.add(album)
    session.commit()
    session.refresh(album)
    
    return AlbumRead(
        id=album.id,
        name=album.name,
        description=album.description,
        created_at=album.created_at,
        cover_image_id=album.cover_image_id,
        image_count=len([img for img in album.images if not img.is_deleted])
    )

@router.delete("/{album_id}")
def delete_album(album_id: int, session: Session = Depends(get_session)):
    album = session.get(Album, album_id)
    if not album or album.is_deleted:
        raise HTTPException(status_code=404, detail="Album not found")
    album.is_deleted = True
    session.add(album)
    session.commit()
    return {"status": "success"}
@router.delete("/{album_id}/photos")
def remove_photos_from_album(album_id: int, image_ids: List[int], session: Session = Depends(get_session)):
    album = session.get(Album, album_id)
    if not album or album.is_deleted:
        raise HTTPException(status_code=404, detail="Album not found")
    
    for img_id in image_ids:
        link = session.exec(
            select(AlbumImageLink).where(AlbumImageLink.album_id == album_id, AlbumImageLink.image_id == img_id)
        ).where(AlbumImageLink.is_deleted == False).first()
        if link:
            link.is_deleted = True
            session.add(link)
    
    session.commit()
    return {"status": "success"}
