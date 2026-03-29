import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session
from app.models import Image, User
import datetime
import base64

def test_read_images_endpoint(client: TestClient, session: Session, admin_token: str):
    # Setup
    img = Image(path="/test.jpg", filename="test.jpg", capture_date=datetime.datetime(2025, 1, 1))
    session.add(img)
    session.commit()

    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/images/", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["filename"] == "test.jpg"

def test_locations_endpoint(client: TestClient, session: Session, admin_token: str):
    # Location logic: Needs location string
    img = Image(path="/loc.jpg", filename="loc.jpg", location="Paris, France")
    session.add(img)
    session.commit()
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/locations/", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Paris, France"
    # Ensure thumbnail logic works (it falls back to content or generates on fly, but in test env file might not exist)
    # The current logic tries to read file if no thumb. Since file doesn't exist, it might fail or return content URL.
    # It returns content URL if generation fails.
    assert data[0]["cover_photo"] == f"/images/content/{img.id}"

def test_timeline_endpoint(client: TestClient, session: Session, admin_token: str):
    img = Image(path="/t1.jpg", filename="t1.jpg", capture_date=datetime.datetime(2025, 5, 20))
    session.add(img)
    session.commit()
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/images/timeline", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "May 2025" in data
