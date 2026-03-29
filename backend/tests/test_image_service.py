import pytest
from sqlmodel import Session
from app.services.image_service import ImageService
from app.models import Image, User
import datetime


def test_get_images_admin(session: Session, admin_user: User):
    # Setup
    img1 = Image(
        path="/p1.jpg",
        filename="p1.jpg",
        capture_date=datetime.datetime(2025, 1, 1),
        location="Loc1",
    )
    img2 = Image(
        path="/p2.jpg",
        filename="p2.jpg",
        capture_date=datetime.datetime(2025, 2, 1),
        location="Loc2",
    )
    session.add(img1)
    session.add(img2)
    session.commit()

    # Test Admin gets all
    results = ImageService.get_images(session, admin_user, limit=10)
    assert len(results) == 2


def test_get_timeline(session: Session):
    img1 = Image(
        path="/p1.jpg", filename="p1.jpg", capture_date=datetime.datetime(2025, 12, 15)
    )
    img2 = Image(
        path="/p2.jpg", filename="p2.jpg", capture_date=datetime.datetime(2025, 12, 1)
    )
    img3 = Image(
        path="/p3.jpg", filename="p3.jpg", capture_date=datetime.datetime(2025, 11, 20)
    )
    session.add(img1)
    session.add(img2)
    session.add(img3)
    session.commit()

    timeline = ImageService.get_timeline(session)
    assert "December 2025" in timeline
    assert "November 2025" in timeline
    assert len(timeline) == 2


def test_date_offset(session: Session, admin_user: User):
    img1 = Image(
        path="/p1.jpg", filename="p1.jpg", capture_date=datetime.datetime(2025, 12, 15)
    )
    img2 = Image(
        path="/p2.jpg", filename="p2.jpg", capture_date=datetime.datetime(2025, 12, 1)
    )
    img3 = Image(
        path="/p3.jpg", filename="p3.jpg", capture_date=datetime.datetime(2025, 11, 20)
    )
    session.add(img1)
    session.add(img2)
    session.add(img3)
    session.commit()

    # Offset for December 2025 (desc order)
    # Should skip everything newer than Dec 2025 end.
    # Dec 2025 is the newest, so offset should be 0?
    # Wait, the frontend sends the date it wants to jump TO.
    # Logic: count items *before* that date.

    # Case: Jump to Dec 2025.
    # Target in desc: End of Dec 2025.
    # Count items > Dec 31 2025. Should be 0.
    offset = ImageService.get_date_offset(session, admin_user, "2025-12", "desc")
    assert offset == 0

    # Case: Jump to Nov 2025.
    # Target: End of Nov 2025.
    # Count items > Nov 30 2025. Should be 2 (the Dec images).
    offset_nov = ImageService.get_date_offset(session, admin_user, "2025-11", "desc")
    assert offset_nov == 2
