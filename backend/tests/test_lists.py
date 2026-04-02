import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User
from services.auth_service import create_access_token


async def _auth_client(client: AsyncClient, db: AsyncSession, *, google_id: str = "glist1") -> tuple[AsyncClient, User]:
    user = User(google_id=google_id, email=f"{google_id}@test.com", name="List User", avatar_url=None)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(user.id)
    client.cookies.set("access_token", f"Bearer {token}")
    return client, user


async def test_get_lists_empty(client: AsyncClient, db_session: AsyncSession):
    c, _ = await _auth_client(client, db_session, google_id="glist_empty")
    resp = await c.get("/api/v1/lists")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_create_list(client: AsyncClient, db_session: AsyncSession):
    c, _ = await _auth_client(client, db_session, google_id="glist_create")
    resp = await c.post("/api/v1/lists", json={"name": "My Tech Stocks"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "My Tech Stocks"
    assert data["stocks"] == []
    assert "id" in data


async def test_add_and_remove_stock(client: AsyncClient, db_session: AsyncSession):
    c, _ = await _auth_client(client, db_session, google_id="glist_stocks")
    lst = (await c.post("/api/v1/lists", json={"name": "Watchlist"})).json()
    list_id = lst["id"]

    # Add stock
    resp = await c.post(f"/api/v1/lists/{list_id}/stocks", json={"symbol": "aapl"})
    assert resp.status_code == 201
    assert resp.json()["symbol"] == "AAPL"  # uppercased

    # List should contain the stock
    resp = await c.get("/api/v1/lists")
    stocks = resp.json()[0]["stocks"]
    assert len(stocks) == 1
    assert stocks[0]["symbol"] == "AAPL"

    # Remove stock
    resp = await c.delete(f"/api/v1/lists/{list_id}/stocks/AAPL")
    assert resp.status_code == 204

    # Stock gone
    resp = await c.get("/api/v1/lists")
    assert resp.json()[0]["stocks"] == []


async def test_duplicate_stock_returns_409(client: AsyncClient, db_session: AsyncSession):
    c, _ = await _auth_client(client, db_session, google_id="glist_dup")
    lst = (await c.post("/api/v1/lists", json={"name": "Dup Test"})).json()
    list_id = lst["id"]
    await c.post(f"/api/v1/lists/{list_id}/stocks", json={"symbol": "MSFT"})
    resp = await c.post(f"/api/v1/lists/{list_id}/stocks", json={"symbol": "MSFT"})
    assert resp.status_code == 409


async def test_delete_list(client: AsyncClient, db_session: AsyncSession):
    c, _ = await _auth_client(client, db_session, google_id="glist_del")
    lst = (await c.post("/api/v1/lists", json={"name": "To Delete"})).json()
    resp = await c.delete(f"/api/v1/lists/{lst['id']}")
    assert resp.status_code == 204
    assert (await c.get("/api/v1/lists")).json() == []


async def test_lists_requires_auth(client: AsyncClient):
    resp = await client.get("/api/v1/lists")
    assert resp.status_code == 401
