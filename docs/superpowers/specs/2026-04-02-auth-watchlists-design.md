# Design: User Auth + Watchlists

**Date:** 2026-04-02  
**Branch:** feature/auth-watchlists  
**Status:** Approved

---

## Overview

Two features added to the Financial Dashboard:

1. **Google OAuth authentication** — users sign in with Google; session managed via JWT in an httpOnly cookie
2. **Watchlists sidebar** — logged-in users get a persistent left sidebar to create named stock lists and add/remove tickers

Unauthenticated users retain full access to the financial dashboard; the sidebar is simply not rendered.

---

## Auth Design

### Flow

1. Header renders a "Sign in with Google" button when no session exists
2. `GET /api/v1/auth/google` — backend (authlib) initiates Google OAuth redirect
3. Google redirects to `GET /api/v1/auth/google/callback` with auth code
4. Backend exchanges code for Google profile (email, name, avatar), upserts `users` row, issues JWT, sets httpOnly cookie, redirects to frontend
5. Frontend calls `GET /api/v1/auth/me` on load — returns current user or 401
6. `GET /api/v1/auth/logout` clears the cookie and returns 200

### Database — `users` table

```sql
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id  TEXT NOT NULL UNIQUE,
  email      TEXT NOT NULL,
  name       TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

### New backend files

| File | Purpose |
|---|---|
| `backend/routers/auth.py` | `/auth/google`, `/auth/google/callback`, `/auth/me`, `/auth/logout` |
| `backend/services/auth_service.py` | JWT creation/verification, user upsert logic |
| `backend/models/user.py` | SQLAlchemy `User` model |
| `backend/db.py` | Async SQLAlchemy engine + session factory |
| `backend/alembic/` | Migration environment (alembic init) |

### New env vars

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...          # random 32-byte secret
DATABASE_URL=postgresql+asyncpg://...   # injected by Railway Postgres plugin
```

### CORS update

`backend/main.py` currently restricts methods to `GET`. Auth and list endpoints need `POST` and `DELETE` — update `allow_methods` to `["GET", "POST", "DELETE"]`.

---

## Watchlists Design

### Database schema

```sql
CREATE TABLE lists (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE list_stocks (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id   UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  symbol    TEXT NOT NULL,
  added_at  TIMESTAMP NOT NULL DEFAULT now(),
  position  INTEGER NOT NULL DEFAULT 0,
  UNIQUE(list_id, symbol)
);
```

### API endpoints (all require valid JWT cookie)

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/api/v1/lists` | — | All lists + their stocks for current user |
| POST | `/api/v1/lists` | `{ name }` | Create a new list |
| DELETE | `/api/v1/lists/{list_id}` | — | Delete a list (cascades stocks) |
| POST | `/api/v1/lists/{list_id}/stocks` | `{ symbol }` | Add stock to list (validates ticker first) |
| DELETE | `/api/v1/lists/{list_id}/stocks/{symbol}` | — | Remove stock from list |

### New backend file

`backend/routers/lists.py` — all 5 endpoints above. Auth dependency injected via `Depends(get_current_user)` from `auth_service.py`.

`backend/models/list.py` — SQLAlchemy `List` and `ListStock` models.

### Frontend — new files

| File | Purpose |
|---|---|
| `frontend/src/components/sidebar/Sidebar.tsx` | Container; renders list of WatchLists; "New List" button at bottom |
| `frontend/src/components/sidebar/WatchList.tsx` | Single collapsible list showing its stocks + AddStockInput |
| `frontend/src/components/sidebar/AddStockInput.tsx` | Inline ticker input; validates against `/api/v1/ticker/{symbol}/info` before saving |
| `frontend/src/hooks/useLists.ts` | Fetches lists on login, exposes create/delete/addStock/removeStock actions |
| `frontend/src/api/lists.ts` | API calls for all 5 list endpoints |
| `frontend/src/types/auth.ts` | `User`, `List`, `ListStock` TypeScript interfaces |

### Frontend — store changes

New state added to `dashboardStore`:

```ts
// Added to State
user: { id: string; name: string; email: string; avatar_url: string } | null;
lists: List[];

// New actions
| { type: 'SET_USER'; payload: User | null }
| { type: 'SET_LISTS'; payload: List[] }
| { type: 'ADD_LIST'; payload: List }
| { type: 'REMOVE_LIST'; payload: string }           // list_id
| { type: 'ADD_STOCK_TO_LIST'; list_id: string; payload: ListStock }
| { type: 'REMOVE_STOCK_FROM_LIST'; list_id: string; symbol: string }
```

### App layout change

`App.tsx` updated to a horizontal flex layout:

```tsx
<DashboardProvider>
  <div className="flex h-screen bg-bg-base text-text-primary overflow-hidden">
    {user && <Sidebar />}
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header />
      <Dashboard />
    </div>
  </div>
</DashboardProvider>
```

### Sidebar behavior

- Clicking a stock in the sidebar dispatches `SET_SYMBOL` — loads that ticker in the main dashboard (same as searching)
- `AddStockInput`: on Enter, calls `/api/v1/ticker/{symbol}/info` to validate ticker exists, then calls `POST /api/v1/lists/{list_id}/stocks`. Shows inline error if ticker not found or already in list
- "New List" button at sidebar bottom prompts for a list name (inline input, not a modal)

---

## Edge Cases

| Situation | Behaviour |
|---|---|
| Google OAuth callback denied by user | Redirect to frontend with `?error=auth_failed`, Header shows inline error |
| JWT expired | `/auth/me` returns 401 → frontend clears user state, hides sidebar, shows Sign In button |
| Invalid ticker typed in sidebar | Show "Ticker not found" inline error, do not save |
| Duplicate stock in same list | Backend returns 409, frontend shows "Already in this list" |
| Delete list with stocks | CASCADE delete handles `list_stocks` rows automatically |
| Unauthenticated request to `/api/v1/lists/*` | 401 — frontend never exposes these routes to guests |
| Railway cold start | Existing behaviour unchanged; Postgres connection pooled via asyncpg |

---

## Infrastructure Changes

1. **Railway:** Add PostgreSQL plugin to existing Railway project → `DATABASE_URL` auto-injected
2. **Google Cloud Console:** Create OAuth 2.0 Web Client ID; add `http://localhost:8000/api/v1/auth/google/callback` (dev) and the Railway callback URL (prod) to Authorized Redirect URIs
3. **Railway env vars:** Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`
4. **Vercel:** No new env vars needed (auth flow is backend-only)
