import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.config import settings

@pytest.mark.asyncio
async def test_admin_login_success():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/api/auth/login", json={
            "username": "admin",
            "password": "AdminPass@2026"
        })
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["role"] == "admin"
        assert data["username"] == "admin"

@pytest.mark.asyncio
async def test_invalid_login_rejected():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/api/auth/login", json={
            "username": "admin",
            "password": "WrongPassword123"
        })
        assert res.status_code == 401

@pytest.mark.asyncio
async def test_all_four_participants_can_login_independently():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        for p in settings.PARTICIPANTS:
            res = await ac.post("/api/auth/login", json={
                "username": p["id"],
                "password": p["default_pw"]
            })
            assert res.status_code == 200, f"Participant {p['id']} failed to log in"
            data = res.json()
            assert data["role"] == "participant"
            assert data["username"] == p["id"]

@pytest.mark.asyncio
async def test_participant_cannot_access_admin_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Login as P001
        res = await ac.post("/api/auth/login", json={
            "username": "P001",
            "password": "Pass@P001"
        })
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Attempt to access admin participants list
        admin_res = await ac.get("/api/auth/participants", headers=headers)
        assert admin_res.status_code == 403
