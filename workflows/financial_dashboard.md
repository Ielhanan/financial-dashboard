# Workflow: Financial Dashboard

## Objective
Run and maintain the financial dashboard web app that displays real published stock financial data (Income Statement, Balance Sheet, Cash Flow, Key Ratios) with multi-year charts for any publicly traded ticker.

## Architecture
- **Frontend**: React (Vite) at `frontend/` → deployed to Vercel
- **Backend**: FastAPI at `backend/` → deployed to Railway
- **Data source**: Yahoo Finance via `yfinance` (no API key required)
- **Cache**: In-process TTLCache, 15-minute TTL, 200 entries max

## Data Flow
1. User types a ticker in `TickerSearch` → dispatches `SET_SYMBOL` to `dashboardStore`
2. `useFinancials` hook fires 6 parallel `Promise.all()` requests to FastAPI
3. FastAPI checks `TTLCache` — cache hit returns immediately, cache miss fetches from yfinance
4. `yfinance_client.py` transforms DataFrames → typed dicts and returns to FastAPI routers
5. React store receives all data → components render charts + financial tables

## API Endpoints (all GET, no auth)

| Endpoint | yfinance source |
|---|---|
| `GET /api/v1/ticker/{symbol}/info` | `ticker.info` |
| `GET /api/v1/ticker/{symbol}/financials?period=annual\|quarterly` | `ticker.financials` / `quarterly_financials` |
| `GET /api/v1/ticker/{symbol}/balance-sheet?period=` | `ticker.balance_sheet` / `quarterly_balance_sheet` |
| `GET /api/v1/ticker/{symbol}/cash-flow?period=` | `ticker.cashflow` / `quarterly_cashflow` |
| `GET /api/v1/ticker/{symbol}/ratios` | `ticker.info` (ratio fields) |
| `GET /api/v1/ticker/{symbol}/charts?period=` | financials + cashflow combined |
| `GET /health` | — |

## Local Development

```bash
# Terminal 1 — backend (from wag/backend/)
python -m uvicorn main:app --reload --port 8000

# Terminal 2 — frontend (from wag/frontend/)
npm run dev
# Vite proxies /api/* to http://localhost:8000 automatically (vite.config.ts)
```

## Deployment

### Railway (backend)
1. Connect GitHub repo to Railway, set **Root Directory** to `backend/`
2. Railway auto-detects the `Dockerfile`
3. Set env vars:
   - `ALLOWED_ORIGINS=https://your-app.vercel.app`
   - `PORT=8000`
4. Verify: `GET https://your-backend.up.railway.app/health` → `{"status": "ok"}`

### Vercel (frontend)
1. Import repo in Vercel, set **Root Directory** to `frontend/`
2. Build: `npm run build` → output: `dist/`
3. Set env var: `VITE_API_BASE_URL=https://your-backend.up.railway.app`
4. After deploy, update Railway `ALLOWED_ORIGINS` to the Vercel URL and redeploy Railway

## Edge Cases

| Situation | Behaviour |
|---|---|
| Invalid ticker | `get_info()` raises `ValueError` → 404 → frontend shows inline error |
| Missing financial field | `df_to_rows()` skips absent DataFrame index keys silently; frontend renders `—` |
| Yahoo Finance rate-limit | 15-min cache prevents most cases; if 429 still occurs, add `time.sleep(1)` in `yfinance_client.py` on cache miss |
| Quarterly date parsing | `format_quarterly_date()` converts pandas Timestamps → `"Q1 2024"` format |
| Railway cold start (free tier) | First request after 30-min idle takes ~5s; upgrade to Hobby ($5/mo) for always-on |
| CORS error | Vercel URL changed → update `ALLOWED_ORIGINS` in Railway + redeploy |
| yfinance field name change | Run `python -c "import yfinance as yf; t=yf.Ticker('AAPL'); print(t.financials.index.tolist())"` to verify actual field names. Pin yfinance version in `backend/requirements.txt` |

## Self-Improvement Notes
- If a yfinance field stops returning data, check `df.index.tolist()` in the backend logs
- When adding a new financial metric: add to the relevant `*_KEYS` / `*_LABELS` / `*_FORMATS` lists in `backend/services/yfinance_client.py` and add it to `HEADER_ROWS` in `frontend/src/components/financials/FinancialsTable.tsx` if it's a key summary line
- When adding a new ratio: add a `(key, label, format)` tuple to `ratio_defs` in `yfinance_client.get_ratios()` and add the key to the appropriate group in `frontend/src/components/financials/KeyRatios.tsx`
