# Auth + Watchlists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google OAuth login and a per-user watchlist sidebar to the Financial Dashboard.

**Architecture:** FastAPI backend handles the Google OAuth flow and issues a JWT in an httpOnly cookie. SQLAlchemy (async) + PostgreSQL on Railway stores users and watchlists. The React frontend renders a persistent left sidebar for logged-in users with named stock lists; unauthenticated users see the dashboard unchanged.

**Tech Stack:** `authlib`, `python-jose`, `sqlalchemy[asyncio]`, `asyncpg`, `alembic`, `aiosqlite` (tests), `pytest-asyncio`, `httpx` (tests) on the backend; React + TypeScript on the frontend, no new frontend libraries.

**Spec:** `docs/superpowers/specs/2026-04-02-auth-watchlists-design.md`

---

## File Map

### Backend — new files
| File | Responsibility |
|---|---|
| `backend/db.py` | Async engine, session factory, `get_db` dependency |
| `backend/models/base.py` | Shared `DeclarativeBase` |
| `backend/models/user.py` | `User` SQLAlchemy model |
| `backend/models/list.py` | `List` + `ListStock` SQLAlchemy models |
| `backend/services/auth_service.py` | JWT creation/decode, user upsert, `get_current_user` dependency |
| `backend/routers/auth.py` | `/auth/google`, `/auth/google/callback`, `/auth/me`, `/auth/logout` |
| `backend/routers/lists.py` | CRUD for lists and stocks |
| `backend/alembic.ini` | Alembic config |
| `backend/alembic/env.py` | Async-aware Alembic environment |
| `backend/alembic/versions/001_initial.py` | Initial migration (users + lists + list_stocks) |
| `backend/tests/__init__.py` | Empty |
| `backend/tests/conftest.py` | Test DB + app overrides |
| `backend/tests/test_auth.py` | Auth endpoint tests |
| `backend/tests/test_lists.py` | Lists endpoint tests |

### Backend — modified files
| File | Change |
|---|---|
| `backend/requirements.txt` | Add 8 new packages |
| `backend/models/__init__.py` | Export models |
| `backend/main.py` | Register routers, add SessionMiddleware, fix CORS methods |

### Frontend — new files
| File | Responsibility |
|---|---|
| `frontend/src/types/auth.ts` | `User`, `WatchList`, `ListStock` TypeScript interfaces |
| `frontend/src/api/auth.ts` | `getMe`, `logout` API calls |
| `frontend/src/api/lists.ts` | `getLists`, `createList`, `deleteList`, `addStock`, `removeStock` API calls |
| `frontend/src/hooks/useLists.ts` | `useAuth` (fetches user on load) + `useLists` (list CRUD actions) |
| `frontend/src/components/sidebar/AddStockInput.tsx` | Inline ticker input with validation |
| `frontend/src/components/sidebar/WatchList.tsx` | Single collapsible watchlist |
| `frontend/src/components/sidebar/Sidebar.tsx` | Sidebar container with "New List" |

### Frontend — modified files
| File | Change |
|---|---|
| `frontend/src/api/client.ts` | Add `credentials: 'include'` to fetch |
| `frontend/src/store/dashboardStore.tsx` | Add `user` + `lists` state and actions |
| `frontend/src/components/layout/Header.tsx` | Add sign-in button / user avatar |
| `frontend/src/App.tsx` | Horizontal flex layout + call `useAuth` + render `<Sidebar />` |

---

## Task 1: Backend Dependencies

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add packages to requirements.txt**

Replace the contents of `backend/requirements.txt` with:

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
yfinance==0.2.65
pandas==2.2.3
pydantic==2.7.1
python-dotenv==1.0.1
cachetools==5.3.3
authlib==1.3.1
httpx==0.27.0
python-jose[cryptography]==3.3.0
sqlalchemy[asyncio]==2.0.30
asyncpg==0.29.0
alembic==1.13.1
aiosqlite==0.20.0
pytest==8.2.0
pytest-asyncio==0.23.6
```

- [ ] **Step 2: Install**

```bash
cd backend
pip install -r requirements.txt
```

Expected: all packages install without conflict.

- [ ] **Step 3: Commit**

```bash
git add backend/requirements.txt
git commit -m "chore: add auth + db dependencies"
```

---

## Task 2: Database Foundation

**Files:**
- Create: `backend/db.py`
- Create: `backend/models/base.py`
- Modify: `backend/models/__init__.py`

- [ ] **Step 1: Create `backend/models/base.py`**

```python
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass
```

- [ ] **Step 2: Create `backend/db.py`**

```python
import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

_raw = os.getenv('DATABASE_URL', 'sqlite+aiosqlite:///./dev.db')

# Railway injects postgres:// — rewrite to asyncpg driver
if _raw.startswith('postgres://'):
    DATABASE_URL = _raw.replace('postgres://', 'postgresql+asyncpg://', 1)
elif _raw.startswith('postgresql://'):
    DATABASE_URL = _raw.replace('postgresql://', 'postgresql+asyncpg://', 1)
else:
    DATABASE_URL = _raw

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

- [ ] **Step 3: Update `backend/models/__init__.py`**

```python
from .base import Base
from .user import User
from .list import List, ListStock

__all__ = ['Base', 'User', 'List', 'ListStock']
```

(This will fail until user.py and list.py exist — create them in Tasks 3 and 4 before running anything.)

- [ ] **Step 4: Commit**

```bash
git add backend/db.py backend/models/base.py backend/models/__init__.py
git commit -m "feat: add async db foundation"
```

---

## Task 3: User Model

**Files:**
- Create: `backend/models/user.py`

- [ ] **Step 1: Create `backend/models/user.py`**

```python
import uuid
import datetime
from sqlalchemy import String, DateTime, Text
from sqlalchemy.orm import relationship, Mapped, mapped_column
from .base import Base


class User(Base):
    __tablename__ = 'users'

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    google_id: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, nullable=False
    )

    lists: Mapped[list['List']] = relationship(  # noqa: F821
        'List', back_populates='user', cascade='all, delete-orphan'
    )
```

- [ ] **Step 2: Commit**

```bash
git add backend/models/user.py
git commit -m "feat: add User model"
```

---

## Task 4: List Models

**Files:**
- Create: `backend/models/list.py`

- [ ] **Step 1: Create `backend/models/list.py`**

```python
import uuid
import datetime
from sqlalchemy import String, DateTime, Text, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from .base import Base


class List(Base):
    __tablename__ = 'lists'

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, nullable=False
    )

    user: Mapped['User'] = relationship('User', back_populates='lists')  # noqa: F821
    stocks: Mapped[list['ListStock']] = relationship(
        'ListStock',
        back_populates='list',
        cascade='all, delete-orphan',
        order_by='ListStock.position',
    )


class ListStock(Base):
    __tablename__ = 'list_stocks'
    __table_args__ = (UniqueConstraint('list_id', 'symbol'),)

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    list_id: Mapped[str] = mapped_column(
        String(36), ForeignKey('lists.id', ondelete='CASCADE'), nullable=False
    )
    symbol: Mapped[str] = mapped_column(Text, nullable=False)
    added_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    list: Mapped['List'] = relationship('List', back_populates='stocks')
```

- [ ] **Step 2: Verify models import cleanly**

```bash
cd backend
python -c "from models import Base, User, List, ListStock; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/models/list.py
git commit -m "feat: add List + ListStock models"
```

---

## Task 5: Alembic Setup + Initial Migration

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Create: `backend/alembic/versions/001_initial.py`

- [ ] **Step 1: Run alembic init**

```bash
cd backend
alembic init alembic
```

This creates `alembic.ini` and `alembic/` directory.

- [ ] **Step 2: Update `backend/alembic.ini`**

Find the line `sqlalchemy.url = ...` and replace it with:

```ini
sqlalchemy.url = sqlite+aiosqlite:///./dev.db
```

(Alembic will use this only for offline mode; online mode reads from DATABASE_URL env var.)

- [ ] **Step 3: Replace `backend/alembic/env.py` with async-aware version**

```python
import asyncio
import os
import sys
from logging.config import fileConfig

from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context

# Make sure backend/ is on the path so model imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from models.base import Base
from models.user import User   # noqa: F401 — registers table with metadata
from models.list import List, ListStock  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _get_url() -> str:
    raw = os.getenv('DATABASE_URL', 'sqlite+aiosqlite:///./dev.db')
    if raw.startswith('postgres://'):
        return raw.replace('postgres://', 'postgresql+asyncpg://', 1)
    if raw.startswith('postgresql://'):
        return raw.replace('postgresql://', 'postgresql+asyncpg://', 1)
    return raw


def run_migrations_offline() -> None:
    context.configure(
        url=_get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={'paramstyle': 'named'},
    )
    with context.begin_transaction():
        context.run_migrations()


def _do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = create_async_engine(_get_url())
    async with engine.begin() as conn:
        await conn.run_sync(_do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
```

- [ ] **Step 4: Generate the initial migration**

```bash
cd backend
alembic revision --autogenerate -m "initial"
```

Expected: creates a file like `backend/alembic/versions/xxxx_initial.py` with `create_table` ops for `users`, `lists`, `list_stocks`.

Verify the generated file contains three `op.create_table(...)` calls. If it's empty, the models weren't imported — check that `env.py` imports all three models.

- [ ] **Step 5: Apply the migration against the local dev SQLite DB**

```bash
cd backend
alembic upgrade head
```

Expected: `Running upgrade  -> xxxx, initial` with no errors. A `dev.db` file appears.

- [ ] **Step 6: Verify tables were created**

```bash
python -c "
import sqlite3, os
conn = sqlite3.connect('dev.db')
tables = conn.execute(\"SELECT name FROM sqlite_master WHERE type='table'\").fetchall()
print([t[0] for t in tables])
"
```

Expected: `['users', 'lists', 'list_stocks']` (plus alembic_version).

- [ ] **Step 7: Add dev.db to .gitignore**

Open `backend/.gitignore` (create it if it doesn't exist) and add:
```
dev.db
```

- [ ] **Step 8: Commit**

```bash
git add backend/alembic.ini backend/alembic/ backend/.gitignore
git commit -m "feat: add alembic migrations for users + lists"
```

---

## Task 6: Auth Service

**Files:**
- Create: `backend/services/auth_service.py`

- [ ] **Step 1: Create `backend/services/auth_service.py`**

```python
import os
from datetime import datetime, timedelta

from fastapi import Cookie, Depends, HTTPException
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from models.user import User

_SECRET = os.getenv('JWT_SECRET', 'dev-secret-change-in-prod')
_ALGORITHM = 'HS256'
_EXPIRE_DAYS = 7


def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=_EXPIRE_DAYS)
    return jwt.encode({'sub': user_id, 'exp': expire}, _SECRET, algorithm=_ALGORITHM)


async def upsert_user(
    db: AsyncSession,
    *,
    google_id: str,
    email: str,
    name: str,
    avatar_url: str | None,
) -> User:
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()
    if user:
        user.name = name
        user.avatar_url = avatar_url
    else:
        user = User(google_id=google_id, email=email, name=name, avatar_url=avatar_url)
        db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_current_user(
    access_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not access_token:
        raise HTTPException(status_code=401, detail='Not authenticated')
    try:
        token = access_token.removeprefix('Bearer ')
        payload = jwt.decode(token, _SECRET, algorithms=[_ALGORITHM])
        user_id: str | None = payload.get('sub')
        if not user_id:
            raise JWTError
    except JWTError:
        raise HTTPException(status_code=401, detail='Invalid token')
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    return user
```

- [ ] **Step 2: Verify it imports cleanly**

```bash
cd backend
python -c "from services.auth_service import create_access_token, get_current_user; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/services/auth_service.py
git commit -m "feat: add JWT auth service"
```

---

## Task 7: Auth Router

**Files:**
- Create: `backend/routers/auth.py`

- [ ] **Step 1: Create `backend/routers/auth.py`**

```python
import os

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request

from db import get_db
from models.user import User
from services.auth_service import create_access_token, get_current_user, upsert_user

router = APIRouter()

FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
_IS_PROD = os.getenv('ENV') == 'production'

_oauth = OAuth()
_oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)


@router.get('/auth/google')
async def login(request: Request):
    redirect_uri = request.url_for('auth_callback')
    return await _oauth.google.authorize_redirect(request, redirect_uri)


@router.get('/auth/google/callback', name='auth_callback')
async def auth_callback(request: Request, db: AsyncSession = Depends(get_db)):
    token = await _oauth.google.authorize_access_token(request)
    info = token.get('userinfo')
    user = await upsert_user(
        db,
        google_id=info['sub'],
        email=info['email'],
        name=info['name'],
        avatar_url=info.get('picture'),
    )
    access_token = create_access_token(user.id)
    response = RedirectResponse(url=FRONTEND_URL)
    response.set_cookie(
        key='access_token',
        value=f'Bearer {access_token}',
        httponly=True,
        samesite='lax',
        max_age=_EXPIRE_DAYS * 24 * 3600,
        secure=_IS_PROD,
    )
    return response


_EXPIRE_DAYS = 7


@router.get('/auth/me')
async def me(user: User = Depends(get_current_user)):
    return {
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'avatar_url': user.avatar_url,
    }


@router.get('/auth/logout')
async def logout(response: Response):
    response.delete_cookie('access_token')
    return {'ok': True}
```

- [ ] **Step 2: Commit**

```bash
git add backend/routers/auth.py
git commit -m "feat: add Google OAuth router"
```

---

## Task 8: Lists Router

**Files:**
- Create: `backend/routers/lists.py`

- [ ] **Step 1: Create `backend/routers/lists.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db import get_db
from models.list import List, ListStock
from models.user import User
from services.auth_service import get_current_user

router = APIRouter()


class CreateListRequest(BaseModel):
    name: str


class AddStockRequest(BaseModel):
    symbol: str


def _serialize_list(lst: List) -> dict:
    return {
        'id': lst.id,
        'name': lst.name,
        'created_at': lst.created_at.isoformat(),
        'stocks': [{'symbol': s.symbol, 'position': s.position} for s in lst.stocks],
    }


@router.get('/lists')
async def get_lists(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(List)
        .where(List.user_id == user.id)
        .options(selectinload(List.stocks))
        .order_by(List.created_at)
    )
    return [_serialize_list(lst) for lst in result.scalars().all()]


@router.post('/lists', status_code=201)
async def create_list(
    body: CreateListRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lst = List(user_id=user.id, name=body.name)
    db.add(lst)
    await db.commit()
    await db.execute(
        select(List).where(List.id == lst.id).options(selectinload(List.stocks))
    )
    await db.refresh(lst)
    lst.stocks  # ensure relationship is loaded (empty list)
    return _serialize_list(lst)


@router.delete('/lists/{list_id}', status_code=204)
async def delete_list(
    list_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(List).where(List.id == list_id, List.user_id == user.id)
    )
    lst = result.scalar_one_or_none()
    if not lst:
        raise HTTPException(status_code=404)
    await db.delete(lst)
    await db.commit()


@router.post('/lists/{list_id}/stocks', status_code=201)
async def add_stock(
    list_id: str,
    body: AddStockRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(List).where(List.id == list_id, List.user_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404)

    symbol = body.symbol.upper().strip()
    dup = await db.execute(
        select(ListStock).where(
            ListStock.list_id == list_id, ListStock.symbol == symbol
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=409, detail='Already in this list')

    stock = ListStock(list_id=list_id, symbol=symbol)
    db.add(stock)
    await db.commit()
    await db.refresh(stock)
    return {'symbol': stock.symbol, 'position': stock.position}


@router.delete('/lists/{list_id}/stocks/{symbol}', status_code=204)
async def remove_stock(
    list_id: str,
    symbol: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ListStock)
        .join(List)
        .where(
            ListStock.list_id == list_id,
            ListStock.symbol == symbol.upper(),
            List.user_id == user.id,
        )
    )
    stock = result.scalar_one_or_none()
    if not stock:
        raise HTTPException(status_code=404)
    await db.delete(stock)
    await db.commit()
```

- [ ] **Step 2: Commit**

```bash
git add backend/routers/lists.py
git commit -m "feat: add watchlists CRUD router"
```

---

## Task 9: Update main.py

**Files:**
- Modify: `backend/main.py`

- [ ] **Step 1: Replace `backend/main.py`**

```python
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from routers import auth, earnings, financials, lists, ratios, search

app = FastAPI(title="Financial Dashboard API", version="1.0.0")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

# SessionMiddleware must be added before CORSMiddleware
app.add_middleware(SessionMiddleware, secret_key=os.getenv("JWT_SECRET", "dev-secret"))
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

app.include_router(search.router,     prefix="/api/v1")
app.include_router(financials.router, prefix="/api/v1")
app.include_router(ratios.router,     prefix="/api/v1")
app.include_router(earnings.router,   prefix="/api/v1")
app.include_router(auth.router,       prefix="/api/v1")
app.include_router(lists.router,      prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 2: Start the backend and verify it boots**

```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

Expected: `Application startup complete.` with no import errors. Hit `http://localhost:8000/health` → `{"status":"ok"}`.

- [ ] **Step 3: Commit**

```bash
git add backend/main.py
git commit -m "feat: register auth + lists routers, fix CORS"
```

---

## Task 10: Backend Test Setup

**Files:**
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Create `backend/tests/__init__.py`**

Empty file.

- [ ] **Step 2: Create `backend/tests/conftest.py`**

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from main import app
from db import get_db
from models.base import Base

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

_test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
_TestSession = async_sessionmaker(_test_engine, expire_on_commit=False)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_tables():
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture()
async def db_session() -> AsyncSession:
    async with _TestSession() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture()
async def client(db_session: AsyncSession) -> AsyncClient:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
```

- [ ] **Step 3: Create `backend/pytest.ini`**

```ini
[pytest]
asyncio_mode = auto
```

- [ ] **Step 4: Run tests (should find 0 tests, no errors)**

```bash
cd backend
pytest tests/ -v
```

Expected: `no tests ran` with no import errors.

- [ ] **Step 5: Commit**

```bash
git add backend/tests/ backend/pytest.ini
git commit -m "test: add backend test setup with in-memory SQLite"
```

---

## Task 11: Auth Endpoint Tests

**Files:**
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: Write the tests**

```python
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
    # Cookie should be deleted (httpx reflects Set-Cookie: access_token=""; Max-Age=0)
    assert resp.cookies.get("access_token") in (None, '""', '')


async def test_me_returns_401_with_invalid_token(client: AsyncClient):
    client.cookies.set("access_token", "Bearer invalid.token.here")
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401
```

- [ ] **Step 2: Run the tests**

```bash
cd backend
pytest tests/test_auth.py -v
```

Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_auth.py
git commit -m "test: add auth endpoint tests"
```

---

## Task 12: Lists Endpoint Tests

**Files:**
- Create: `backend/tests/test_lists.py`

- [ ] **Step 1: Write the tests**

```python
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User
from services.auth_service import create_access_token


async def _auth_client(client: AsyncClient, db: AsyncSession) -> tuple[AsyncClient, User]:
    user = User(google_id="glist1", email="list@test.com", name="List User", avatar_url=None)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(user.id)
    client.cookies.set("access_token", f"Bearer {token}")
    return client, user


async def test_get_lists_empty(client: AsyncClient, db_session: AsyncSession):
    c, _ = await _auth_client(client, db_session)
    resp = await c.get("/api/v1/lists")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_create_list(client: AsyncClient, db_session: AsyncSession):
    c, _ = await _auth_client(client, db_session)
    resp = await c.post("/api/v1/lists", json={"name": "My Tech Stocks"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "My Tech Stocks"
    assert data["stocks"] == []
    assert "id" in data


async def test_add_and_remove_stock(client: AsyncClient, db_session: AsyncSession):
    c, _ = await _auth_client(client, db_session)
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
    c, _ = await _auth_client(client, db_session)
    lst = (await c.post("/api/v1/lists", json={"name": "Dup Test"})).json()
    list_id = lst["id"]
    await c.post(f"/api/v1/lists/{list_id}/stocks", json={"symbol": "MSFT"})
    resp = await c.post(f"/api/v1/lists/{list_id}/stocks", json={"symbol": "MSFT"})
    assert resp.status_code == 409


async def test_delete_list(client: AsyncClient, db_session: AsyncSession):
    c, _ = await _auth_client(client, db_session)
    lst = (await c.post("/api/v1/lists", json={"name": "To Delete"})).json()
    resp = await c.delete(f"/api/v1/lists/{lst['id']}")
    assert resp.status_code == 204
    assert (await c.get("/api/v1/lists")).json() == []


async def test_lists_requires_auth(client: AsyncClient):
    resp = await client.get("/api/v1/lists")
    assert resp.status_code == 401
```

- [ ] **Step 2: Run the tests**

```bash
cd backend
pytest tests/test_lists.py -v
```

Expected: 6 tests pass.

- [ ] **Step 3: Run all backend tests**

```bash
cd backend
pytest tests/ -v
```

Expected: 10 tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_lists.py
git commit -m "test: add lists endpoint tests"
```

---

## Task 13: Frontend TypeScript Types

**Files:**
- Create: `frontend/src/types/auth.ts`

- [ ] **Step 1: Create `frontend/src/types/auth.ts`**

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

export interface ListStock {
  symbol: string;
  position: number;
}

export interface WatchList {
  id: string;
  name: string;
  created_at: string;
  stocks: ListStock[];
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/types/auth.ts
git commit -m "feat: add auth + watchlist TypeScript types"
```

---

## Task 14: Update Dashboard Store

**Files:**
- Modify: `frontend/src/store/dashboardStore.tsx`

- [ ] **Step 1: Replace `frontend/src/store/dashboardStore.tsx`**

```tsx
import React, { createContext, useContext, useReducer } from 'react';
import type {
  ChartsResponse,
  EarningsHistoryResponse,
  FinancialTab,
  FinancialsResponse,
  Period,
  RatiosResponse,
  Tab,
  TickerInfo,
} from '../types/financial';
import type { User, WatchList, ListStock } from '../types/auth';

interface State {
  symbol: string | null;
  activeTab: Tab;
  period: Period;
  info: TickerInfo | null;
  financials: Record<FinancialTab, FinancialsResponse | null>;
  charts: ChartsResponse | null;
  ratios: RatiosResponse | null;
  earnings: EarningsHistoryResponse | null;
  loading: boolean;
  error: string | null;
  user: User | null;
  lists: WatchList[];
}

type Action =
  | { type: 'SET_SYMBOL'; payload: string }
  | { type: 'SET_TAB'; payload: Tab }
  | { type: 'SET_PERIOD'; payload: Period }
  | { type: 'SET_INFO'; payload: TickerInfo }
  | { type: 'SET_FINANCIALS'; tab: FinancialTab; payload: FinancialsResponse }
  | { type: 'SET_CHARTS'; payload: ChartsResponse }
  | { type: 'SET_RATIOS'; payload: RatiosResponse }
  | { type: 'SET_EARNINGS'; payload: EarningsHistoryResponse }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_LISTS'; payload: WatchList[] }
  | { type: 'ADD_LIST'; payload: WatchList }
  | { type: 'REMOVE_LIST'; payload: string }
  | { type: 'ADD_STOCK_TO_LIST'; list_id: string; payload: ListStock }
  | { type: 'REMOVE_STOCK_FROM_LIST'; list_id: string; symbol: string };

const initialFinancials: Record<FinancialTab, FinancialsResponse | null> = {
  income: null, balance: null, cashflow: null,
};

const initialState: State = {
  symbol: null,
  activeTab: 'income',
  period: 'annual',
  info: null,
  financials: initialFinancials,
  charts: null,
  ratios: null,
  earnings: null,
  loading: false,
  error: null,
  user: null,
  lists: [],
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_SYMBOL':
      return { ...initialState, symbol: action.payload, user: state.user, lists: state.lists };
    case 'SET_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_PERIOD':
      return { ...state, period: action.payload, financials: initialFinancials, charts: null };
    case 'SET_INFO':
      return { ...state, info: action.payload };
    case 'SET_FINANCIALS':
      return { ...state, financials: { ...state.financials, [action.tab]: action.payload } };
    case 'SET_CHARTS':
      return { ...state, charts: action.payload };
    case 'SET_RATIOS':
      return { ...state, ratios: action.payload };
    case 'SET_EARNINGS':
      return { ...state, earnings: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_LISTS':
      return { ...state, lists: action.payload };
    case 'ADD_LIST':
      return { ...state, lists: [...state.lists, action.payload] };
    case 'REMOVE_LIST':
      return { ...state, lists: state.lists.filter(l => l.id !== action.payload) };
    case 'ADD_STOCK_TO_LIST':
      return {
        ...state,
        lists: state.lists.map(l =>
          l.id === action.list_id
            ? { ...l, stocks: [...l.stocks, action.payload] }
            : l
        ),
      };
    case 'REMOVE_STOCK_FROM_LIST':
      return {
        ...state,
        lists: state.lists.map(l =>
          l.id === action.list_id
            ? { ...l, stocks: l.stocks.filter(s => s.symbol !== action.symbol) }
            : l
        ),
      };
    default:
      return state;
  }
}

const DashboardContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <DashboardContext.Provider value={{ state, dispatch }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}
```

Note the key change in `SET_SYMBOL`: `user` and `lists` are preserved so searching a new ticker doesn't wipe the watchlists.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/store/dashboardStore.tsx
git commit -m "feat: add user + lists state to dashboard store"
```

---

## Task 15: API Clients

**Files:**
- Modify: `frontend/src/api/client.ts`
- Create: `frontend/src/api/auth.ts`
- Create: `frontend/src/api/lists.ts`

- [ ] **Step 1: Add `credentials: 'include'` to `frontend/src/api/client.ts`**

Change line 5 from:
```typescript
  const res = await fetch(`${BASE}${path}`);
```
to:
```typescript
  const res = await fetch(`${BASE}${path}`, { credentials: 'include' });
```

- [ ] **Step 2: Create `frontend/src/api/auth.ts`**

```typescript
import type { User } from '../types/auth';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: 'include' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const authApi = {
  getMe: () => get<User>('/api/v1/auth/me'),
  logout: () => get<{ ok: boolean }>('/api/v1/auth/logout'),
  loginUrl: `${BASE}/api/v1/auth/google`,
};
```

- [ ] **Step 3: Create `frontend/src/api/lists.ts`**

```typescript
import type { WatchList, ListStock } from '../types/auth';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const listsApi = {
  getLists: () => request<WatchList[]>('GET', '/api/v1/lists'),
  createList: (name: string) => request<WatchList>('POST', '/api/v1/lists', { name }),
  deleteList: (listId: string) => request<void>('DELETE', `/api/v1/lists/${listId}`),
  addStock: (listId: string, symbol: string) =>
    request<ListStock>('POST', `/api/v1/lists/${listId}/stocks`, { symbol }),
  removeStock: (listId: string, symbol: string) =>
    request<void>('DELETE', `/api/v1/lists/${listId}/stocks/${symbol}`),
};
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/client.ts frontend/src/api/auth.ts frontend/src/api/lists.ts
git commit -m "feat: add auth + lists API clients"
```

---

## Task 16: useAuth + useLists Hooks

**Files:**
- Create: `frontend/src/hooks/useLists.ts`

- [ ] **Step 1: Create `frontend/src/hooks/useLists.ts`**

```typescript
import { useEffect } from 'react';
import { useDashboard } from '../store/dashboardStore';
import { authApi } from '../api/auth';
import { listsApi } from '../api/lists';

export function useAuth() {
  const { dispatch } = useDashboard();

  useEffect(() => {
    authApi.getMe()
      .then(user => dispatch({ type: 'SET_USER', payload: user }))
      .catch(() => dispatch({ type: 'SET_USER', payload: null }));
  }, [dispatch]);
}

export function useLists() {
  const { state, dispatch } = useDashboard();
  const { user } = state;

  useEffect(() => {
    if (!user) {
      dispatch({ type: 'SET_LISTS', payload: [] });
      return;
    }
    listsApi.getLists()
      .then(lists => dispatch({ type: 'SET_LISTS', payload: lists }))
      .catch(() => {});
  }, [user, dispatch]);

  const createList = async (name: string) => {
    const list = await listsApi.createList(name);
    dispatch({ type: 'ADD_LIST', payload: list });
    return list;
  };

  const deleteList = async (listId: string) => {
    await listsApi.deleteList(listId);
    dispatch({ type: 'REMOVE_LIST', payload: listId });
  };

  const addStock = async (listId: string, symbol: string) => {
    const stock = await listsApi.addStock(listId, symbol);
    dispatch({ type: 'ADD_STOCK_TO_LIST', list_id: listId, payload: stock });
    return stock;
  };

  const removeStock = async (listId: string, symbol: string) => {
    await listsApi.removeStock(listId, symbol);
    dispatch({ type: 'REMOVE_STOCK_FROM_LIST', list_id: listId, symbol });
  };

  return { createList, deleteList, addStock, removeStock };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useLists.ts
git commit -m "feat: add useAuth + useLists hooks"
```

---

## Task 17: Update Header

**Files:**
- Modify: `frontend/src/components/layout/Header.tsx`

- [ ] **Step 1: Replace `frontend/src/components/layout/Header.tsx`**

```tsx
import { useDashboard } from '../../store/dashboardStore';
import { authApi } from '../../api/auth';
import TickerSearch from '../search/TickerSearch';

export default function Header() {
  const { state, dispatch } = useDashboard();
  const { user } = state;

  const handleLogout = async () => {
    await authApi.logout();
    dispatch({ type: 'SET_USER', payload: null });
  };

  return (
    <header className="bg-bg-surface border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span className="text-text-primary font-semibold text-sm tracking-wider uppercase">
          Financial Dashboard
        </span>
      </div>
      <TickerSearch />
      <div className="flex items-center gap-3 ml-4">
        {user ? (
          <>
            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-7 h-7 rounded-full"
              />
            )}
            <span className="text-text-secondary text-sm hidden sm:block">{user.name}</span>
            <button
              onClick={handleLogout}
              className="text-text-muted text-xs hover:text-text-secondary transition-colors"
            >
              Sign out
            </button>
          </>
        ) : (
          <a
            href={authApi.loginUrl}
            className="text-xs bg-accent text-white px-3 py-1.5 rounded hover:opacity-90 transition-opacity"
          >
            Sign in with Google
          </a>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/Header.tsx
git commit -m "feat: add sign in/out to Header"
```

---

## Task 18: AddStockInput Component

**Files:**
- Create: `frontend/src/components/sidebar/AddStockInput.tsx`

- [ ] **Step 1: Create `frontend/src/components/sidebar/AddStockInput.tsx`**

```tsx
import { useState, useRef } from 'react';
import { api } from '../../api/client';
import { useLists } from '../../hooks/useLists';

interface Props {
  listId: string;
}

export default function AddStockInput({ listId }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addStock } = useLists();

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const symbol = value.trim().toUpperCase();
    if (!symbol) return;

    setLoading(true);
    setError(null);

    try {
      // Validate ticker exists
      await api.getInfo(symbol);
    } catch {
      setError('Ticker not found');
      setLoading(false);
      return;
    }

    try {
      await addStock(listId, symbol);
      setValue('');
      inputRef.current?.blur();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      setError(msg === 'Already in this list' ? 'Already in this list' : 'Failed to add');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-2 pb-1">
      <input
        ref={inputRef}
        value={value}
        onChange={e => { setValue(e.target.value); setError(null); }}
        onKeyDown={handleKeyDown}
        placeholder={loading ? 'Adding…' : '+ Add ticker'}
        disabled={loading}
        className="w-full bg-transparent text-text-secondary text-xs placeholder-text-muted border-b border-border focus:outline-none focus:border-accent py-1 uppercase"
      />
      {error && <p className="text-negative text-xs mt-0.5">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/sidebar/AddStockInput.tsx
git commit -m "feat: add AddStockInput component"
```

---

## Task 19: WatchList Component

**Files:**
- Create: `frontend/src/components/sidebar/WatchList.tsx`

- [ ] **Step 1: Create `frontend/src/components/sidebar/WatchList.tsx`**

```tsx
import { useState } from 'react';
import { useDashboard } from '../../store/dashboardStore';
import { useLists } from '../../hooks/useLists';
import AddStockInput from './AddStockInput';
import type { WatchList as WatchListType } from '../../types/auth';

interface Props {
  list: WatchListType;
}

export default function WatchList({ list }: Props) {
  const [open, setOpen] = useState(true);
  const { dispatch } = useDashboard();
  const { deleteList, removeStock } = useLists();

  const handleStockClick = (symbol: string) => {
    dispatch({ type: 'SET_SYMBOL', payload: symbol });
  };

  return (
    <div className="border-b border-border last:border-0">
      {/* List header */}
      <div className="flex items-center justify-between px-3 py-2 group">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
        >
          <span className="text-text-muted text-xs">{open ? '▾' : '▸'}</span>
          <span className="text-text-secondary text-xs font-medium truncate">{list.name}</span>
          <span className="text-text-muted text-xs ml-1">({list.stocks.length})</span>
        </button>
        <button
          onClick={() => deleteList(list.id)}
          className="text-text-muted text-xs opacity-0 group-hover:opacity-100 hover:text-negative transition-all ml-1 flex-shrink-0"
          title="Delete list"
        >
          ✕
        </button>
      </div>

      {/* Stocks */}
      {open && (
        <div className="pb-1">
          {list.stocks.map(stock => (
            <div
              key={stock.symbol}
              className="flex items-center justify-between px-4 py-1 group/stock hover:bg-bg-surface cursor-pointer"
              onClick={() => handleStockClick(stock.symbol)}
            >
              <span className="text-text-primary text-xs font-numbers">{stock.symbol}</span>
              <button
                onClick={e => { e.stopPropagation(); removeStock(list.id, stock.symbol); }}
                className="text-text-muted text-xs opacity-0 group-hover/stock:opacity-100 hover:text-negative transition-all"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
          <AddStockInput listId={list.id} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/sidebar/WatchList.tsx
git commit -m "feat: add WatchList component"
```

---

## Task 20: Sidebar Component

**Files:**
- Create: `frontend/src/components/sidebar/Sidebar.tsx`

- [ ] **Step 1: Create `frontend/src/components/sidebar/Sidebar.tsx`**

```tsx
import { useState, useRef } from 'react';
import { useDashboard } from '../../store/dashboardStore';
import { useLists } from '../../hooks/useLists';
import WatchList from './WatchList';

export default function Sidebar() {
  const { state } = useDashboard();
  const { createList } = useLists();
  const { lists } = state;

  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCreateList = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setCreatingList(false);
      setNewListName('');
      return;
    }
    if (e.key !== 'Enter') return;
    const name = newListName.trim();
    if (!name) return;
    await createList(name);
    setNewListName('');
    setCreatingList(false);
  };

  const startCreating = () => {
    setCreatingList(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <aside className="w-52 flex-shrink-0 bg-bg-surface border-r border-border flex flex-col overflow-hidden">
      <div className="px-3 py-3 border-b border-border">
        <span className="text-text-muted text-xs uppercase tracking-wider font-semibold">
          Watchlists
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {lists.length === 0 && !creatingList && (
          <p className="text-text-muted text-xs px-3 py-4">No lists yet.</p>
        )}
        {lists.map(list => (
          <WatchList key={list.id} list={list} />
        ))}
      </div>

      <div className="border-t border-border p-2">
        {creatingList ? (
          <input
            ref={inputRef}
            value={newListName}
            onChange={e => setNewListName(e.target.value)}
            onKeyDown={handleCreateList}
            onBlur={() => { setCreatingList(false); setNewListName(''); }}
            placeholder="List name…"
            className="w-full bg-transparent text-text-secondary text-xs border-b border-accent focus:outline-none py-1"
          />
        ) : (
          <button
            onClick={startCreating}
            className="w-full text-left text-text-muted text-xs hover:text-text-secondary transition-colors py-1"
          >
            + New list
          </button>
        )}
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/sidebar/Sidebar.tsx
git commit -m "feat: add Sidebar component"
```

---

## Task 21: Update App.tsx Layout

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Replace `frontend/src/App.tsx`**

```tsx
import { DashboardProvider, useDashboard } from './store/dashboardStore';
import { useFinancials } from './hooks/useFinancials';
import { useAuth, useLists } from './hooks/useLists';
import Header from './components/layout/Header';
import Sidebar from './components/sidebar/Sidebar';
import StatCard from './components/ui/StatCard';
import TabBar from './components/ui/TabBar';
import PeriodToggle from './components/ui/PeriodToggle';
import LoadingSpinner from './components/ui/LoadingSpinner';
import FinancialsTable from './components/financials/FinancialsTable';
import KeyRatios from './components/financials/KeyRatios';
import RevenueChart from './components/charts/RevenueChart';
import NetIncomeChart from './components/charts/NetIncomeChart';
import EPSChart from './components/charts/EPSChart';
import FreeCashFlowChart from './components/charts/FreeCashFlowChart';
import { formatValue } from './components/financials/FinancialsTable';
import EarningsChart from './components/financials/EarningsChart';
import EarningsTable from './components/financials/EarningsTable';

function formatPct(v: number | null): string {
  if (v == null) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${(v * 100).toFixed(2)}%`;
}

function Dashboard() {
  useFinancials();
  useAuth();
  useLists();
  const { state } = useDashboard();
  const { symbol, info, financials, charts, ratios, earnings, loading, error, activeTab, user } = state;

  if (!symbol) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center px-4 py-20">
        <div className="text-5xl mb-6">📊</div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">Financial Dashboard</h1>
        <p className="text-text-secondary text-sm max-w-xs">
          Enter a stock ticker in the search bar above to view financial statements, key ratios, and charts.
        </p>
        <div className="mt-6 flex gap-2 flex-wrap justify-center">
          {['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN'].map((t) => (
            <span key={t} className="bg-bg-surface border border-border text-text-secondary text-xs font-numbers px-3 py-1 rounded">
              {t}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="flex items-center justify-center flex-1 py-20">
        <div className="bg-bg-surface border border-red-900/50 rounded p-6 max-w-sm text-center">
          <div className="text-negative text-sm font-medium mb-1">Error</div>
          <div className="text-text-secondary text-sm">{error}</div>
        </div>
      </div>
    );
  }

  const priceChangePct = info?.price_change_pct ?? null;

  return (
    <main className="flex-1 overflow-auto">
      {info && (
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-text-primary">{info.symbol}</h2>
                <span className="text-text-secondary text-sm">{info.name}</span>
              </div>
              <div className="text-text-muted text-xs mt-0.5">
                {info.exchange} · {info.sector} · {info.industry}
              </div>
            </div>
            <PeriodToggle />
          </div>
          <div className="flex gap-3 flex-wrap">
            <StatCard
              label="Price"
              value={info.current_price != null ? `$${info.current_price.toFixed(2)}` : '—'}
              sub={priceChangePct != null ? formatPct(priceChangePct) : undefined}
              positive={priceChangePct != null && priceChangePct >= 0}
              negative={priceChangePct != null && priceChangePct < 0}
            />
            <StatCard label="Market Cap" value={formatValue(info.market_cap, 'currency')} />
            {ratios && (() => {
              const byKey = Object.fromEntries(ratios.ratios.map((r) => [r.key, r]));
              return (
                <>
                  <StatCard label="P/E (TTM)"  value={byKey['trailingPE']          ? formatValue(byKey['trailingPE'].value,          'ratio')   : '—'} />
                  <StatCard label="EV/EBITDA"  value={byKey['enterpriseToEbitda']  ? formatValue(byKey['enterpriseToEbitda'].value,  'ratio')   : '—'} />
                  <StatCard label="Net Margin" value={byKey['profitMargins']       ? formatValue(byKey['profitMargins'].value,       'percent') : '—'} />
                  <StatCard label="ROE"        value={byKey['returnOnEquity']      ? formatValue(byKey['returnOnEquity'].value,      'percent') : '—'} />
                </>
              );
            })()}
          </div>
        </div>
      )}

      {charts && (
        <div className="px-6 py-4 grid grid-cols-2 xl:grid-cols-4 gap-4 border-b border-border">
          <RevenueChart charts={charts} />
          <NetIncomeChart charts={charts} />
          <EPSChart charts={charts} />
          <FreeCashFlowChart charts={charts} />
        </div>
      )}

      <div className="px-6 pt-4 pb-2">
        <TabBar />
      </div>
      <div className="pb-8">
        {activeTab === 'income'   && financials.income   && <FinancialsTable dates={financials.income.dates}   rows={financials.income.rows} />}
        {activeTab === 'balance'  && financials.balance  && <FinancialsTable dates={financials.balance.dates}  rows={financials.balance.rows} />}
        {activeTab === 'cashflow' && financials.cashflow && <FinancialsTable dates={financials.cashflow.dates} rows={financials.cashflow.rows} />}
        {activeTab === 'ratios'   && ratios              && <KeyRatios ratios={ratios.ratios} />}
        {activeTab === 'earnings' && earnings            && (
          <div className="px-6 pt-4">
            <EarningsChart earnings={earnings} />
            <EarningsTable earnings={earnings} />
          </div>
        )}
      </div>
    </main>
  );
}

export default function App() {
  return (
    <DashboardProvider>
      <div className="flex h-screen bg-bg-base text-text-primary overflow-hidden">
        <InnerApp />
      </div>
    </DashboardProvider>
  );
}

function InnerApp() {
  const { state } = useDashboard();
  return (
    <>
      {state.user && <Sidebar />}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <Dashboard />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Build the frontend to check for TypeScript errors**

```bash
cd frontend
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: update App layout with Sidebar + auth hooks"
```

---

## Task 22: Infrastructure Setup (Manual Steps)

These steps are done in external services — not automated.

- [ ] **Step 1: Add Railway PostgreSQL**

1. Open your Railway project dashboard
2. Click **+ New** → **Database** → **PostgreSQL**
3. Railway auto-injects `DATABASE_URL` into your backend service — no manual copy needed
4. Redeploy the backend; Alembic will run via the start command below

- [ ] **Step 2: Update Railway start command**

In Railway → your backend service → Settings → Start Command, set:

```
alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port $PORT
```

This runs migrations before the server starts on every deploy.

- [ ] **Step 3: Create Google OAuth credentials**

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create **OAuth 2.0 Client ID** (type: Web application)
3. Add Authorized Redirect URIs:
   - `http://localhost:8000/api/v1/auth/google/callback` (dev)
   - `https://your-backend.up.railway.app/api/v1/auth/google/callback` (prod)
4. Copy **Client ID** and **Client Secret**

- [ ] **Step 4: Set Railway env vars**

In Railway → your backend service → Variables, add:

```
GOOGLE_CLIENT_ID=<from step 3>
GOOGLE_CLIENT_SECRET=<from step 3>
JWT_SECRET=<generate: python -c "import secrets; print(secrets.token_hex(32))">
FRONTEND_URL=https://your-app.vercel.app
ENV=production
```

- [ ] **Step 5: Set local .env**

Add to `backend/.env`:

```
GOOGLE_CLIENT_ID=<your client id>
GOOGLE_CLIENT_SECRET=<your client secret>
JWT_SECRET=dev-secret-local
FRONTEND_URL=http://localhost:5173
```

- [ ] **Step 6: Smoke test locally**

```bash
# Terminal 1
cd backend && python -m uvicorn main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
```

1. Open `http://localhost:5173`
2. Click "Sign in with Google" → should redirect to Google
3. After login, sidebar should appear
4. Create a list, add a ticker (e.g. `AAPL`), click it — dashboard should load AAPL
5. Sign out — sidebar disappears

---

## Self-Review Checklist

- [x] All spec requirements covered (auth flow, /me, /logout, list CRUD, sidebar, unauthenticated access)
- [x] No TBD or TODO placeholders
- [x] Types consistent across tasks (`WatchList`, `ListStock`, `User` defined in Task 13, used in Tasks 14–21)
- [x] `useLists()` called in `Dashboard` (Task 21) where `useDashboard()` context is available
- [x] `SET_SYMBOL` preserves `user` and `lists` state (Task 14)
- [x] CORS updated for POST/DELETE (Task 9)
- [x] SessionMiddleware added before CORSMiddleware (Task 9)
