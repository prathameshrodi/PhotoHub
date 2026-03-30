from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, SQLModel
from typing import List, Optional
from pydantic import BaseModel

from app.db.session import get_session
from app.models import Person, Image, ImageRead, User
from app.core import security

router = APIRouter()


class PersonRead(SQLModel):
    id: int
    name: str
    cover_photo: Optional[str] = None
    photo_count: int = 0


class PersonUpdate(BaseModel):
    name: str


class MergeRequest(BaseModel):
    target_id: int
    source_ids: List[int]


@router.get("/", response_model=List[PersonRead])
def read_people(session: Session = Depends(get_session)):
    people = session.exec(select(Person)).all()
    result = []
    for p in people:
        cover = None
        count = 0
        if p.faces:
            count = len(p.faces)
            best_face = None
            # Prioritize single-face images
            for f in p.faces:
                if f.image and len(f.image.faces) == 1:
                    best_face = f
                    break
            if not best_face:
                for f in p.faces:
                    if f.image:
                        best_face = f
                        break

            if best_face and best_face.image:
                # Use the dedicated thumbnail endpoint
                cover = f"images/thumbnail/{best_face.image.id}"

        result.append(
            PersonRead(id=p.id, name=p.name, cover_photo=cover, photo_count=count)
        )
    return result


@router.get("/{person_id}", response_model=PersonRead)
def read_person(person_id: int, session: Session = Depends(get_session)):
    p = session.get(Person, person_id)
    if not p:
        raise HTTPException(status_code=404, detail="Person not found")

    cover = None
    count = 0
    if p.faces:
        count = len(p.faces)
        best_face = None
        for f in p.faces:
            if f.image and len(f.image.faces) == 1:
                best_face = f
                break
        if not best_face:
            for f in p.faces:
                if f.image:
                    best_face = f
                    break

        if best_face and best_face.image:
            cover = f"images/thumbnail/{best_face.image.id}"

    return PersonRead(id=p.id, name=p.name, cover_photo=cover, photo_count=count)


@router.put("/{person_id}", response_model=Person)
def update_person(
    person_id: int, person_update: PersonUpdate, session: Session = Depends(get_session)
):
    db_person = session.get(Person, person_id)
    if not db_person:
        raise HTTPException(status_code=404, detail="Person not found")
    db_person.name = person_update.name
    session.add(db_person)
    session.commit()
    session.refresh(db_person)
    return db_person


@router.post("/merge")
def merge_people(
    request: MergeRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(security.get_current_user),
):
    target = session.get(Person, request.target_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target person not found")

    for source_id in request.source_ids:
        if source_id == request.target_id:
            continue
        source = session.get(Person, source_id)
        if not source:
            continue

        # Reassign faces -- Note: This might create duplicates if we strictly track unique faces, but here it's fine
        for face in source.faces:
            face.person_id = target.id
            session.add(face)

        session.delete(source)

    session.commit()
    return {
        "status": "success",
        "message": f"Merged {len(request.source_ids)} people into {target.name}",
    }


@router.get("/{person_id}/images", response_model=List[ImageRead])
def read_person_images(person_id: int, session: Session = Depends(get_session)):
    person = session.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    image_ids = {face.image_id for face in person.faces if face.image_id}
    images = session.exec(select(Image).where(Image.id.in_(image_ids))).all()
    # Sort images too?
    return images
