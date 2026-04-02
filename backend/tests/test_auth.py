import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User
from services.auth_service import create_access_token


async def _make_user(db: AsyncSession, *, google_id="g123", email="test@example.com", name="Test User") -> User:
    user = User(google_id=google_id, email=email, name=name, avatar_url=None)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def test_me_returns_401_when_not_logged_in(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


async def test_me_returns_user_when_logged_in(client: AsyncClient, db_session: AsyncSession):
    user = await _make_user(db_session)
    token = create_access_token(user.id)
    client.cookies.set("access_token", f"Bearer {token}")

    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "test@example.com"
    assert data["name"] == "Test User"


async def test_logout_clears_cookie(client: AsyncClient, db_session: AsyncSession):
    user = await _make_user(db_session, google_id="g456", email="b@b.com", name="B")
    token = create_access_token(user.id)
    client.cookies.set("access_token", f"Bearer {token}")

    resp = await client.get("/api/v1/auth/logout")
    assert resp.status_code == 200
    assert resp.cookies.get("access_token") in (None, '""', '')


async def test_me_returns_401_with_invalid_token(client: AsyncClient):
    client.cookies.set("access_token", "Bearer invalid.token.here")
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401
