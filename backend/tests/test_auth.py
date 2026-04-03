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


async def test_register_creates_user_and_sets_cookie(client: AsyncClient):
    resp = await client.post('/api/v1/auth/register', json={
        'email': 'new@example.com',
        'name': 'New User',
        'password': 'secret123',
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data['email'] == 'new@example.com'
    assert data['name'] == 'New User'
    assert 'access_token' in resp.cookies


async def test_register_duplicate_email_returns_409(client: AsyncClient):
    payload = {'email': 'dup@example.com', 'name': 'Dup', 'password': 'abc'}
    await client.post('/api/v1/auth/register', json=payload)
    resp = await client.post('/api/v1/auth/register', json=payload)
    assert resp.status_code == 409


async def test_login_returns_user_and_sets_cookie(client: AsyncClient):
    await client.post('/api/v1/auth/register', json={
        'email': 'login@example.com',
        'name': 'Login User',
        'password': 'mypassword',
    })
    resp = await client.post('/api/v1/auth/login', json={
        'email': 'login@example.com',
        'password': 'mypassword',
    })
    assert resp.status_code == 200
    assert resp.json()['email'] == 'login@example.com'
    assert 'access_token' in resp.cookies


async def test_login_wrong_password_returns_401(client: AsyncClient):
    await client.post('/api/v1/auth/register', json={
        'email': 'wrong@example.com',
        'name': 'Wrong',
        'password': 'correct',
    })
    resp = await client.post('/api/v1/auth/login', json={
        'email': 'wrong@example.com',
        'password': 'incorrect',
    })
    assert resp.status_code == 401


async def test_login_unknown_email_returns_401(client: AsyncClient):
    resp = await client.post('/api/v1/auth/login', json={
        'email': 'ghost@example.com',
        'password': 'anything',
    })
    assert resp.status_code == 401
