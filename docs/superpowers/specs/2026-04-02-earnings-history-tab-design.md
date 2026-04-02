# Design: Earnings History Tab

**Date:** 2026-04-02  
**Status:** Approved

---

## Objective

Add a 5th "Earnings" tab to the financial dashboard that displays quarterly EPS estimates vs actuals for the past 4 years (~16 quarters), both as a chart and a table.

---

## Backend

### New endpoint

```
GET /api/v1/ticker/{symbol}/earnings-history
```

**New file:** `backend/routers/earnings.py`  
**Registered in:** `backend/main.py` with prefix `/api/v1`

**New service function:** `get_earnings_history(symbol: str)` in `backend/services/yfinance_client.py`

**Implementation:**

```python
ticker.get_earnings_dates(limit=20)
```

Returns a DataFrame indexed by earnings date with columns:
- `EPS Estimate`
- `Reported EPS`
- `Surprise(%)`

**Transform steps:**
1. Drop rows where `Reported EPS` is NaN (future scheduled dates).
2. Keep the most recent 16 rows.
3. Reverse order so oldest quarter is first (chronological left-to-right for chart).
4. Format index timestamps as `"Q1 2024"` using the existing `_format_quarterly_date()` helper.
5. Compute `surprise` = `Reported EPS - EPS Estimate` (dollar amount).
6. Compute `beat: bool` = `Reported EPS >= EPS Estimate`.

**Response shape:**

```json
{
  "symbol": "AAPL",
  "quarters": ["Q2 2022", "Q3 2022", ...],
  "estimated_eps": [1.19, 1.27, ...],
  "actual_eps": [1.20, 1.29, ...],
  "surprise": [0.01, 0.02, ...],
  "surprise_pct": [0.84, 1.57, ...],
  "beat": [true, true, ...]
}
```

**Error handling:** Same pattern as existing routers — `ValueError` → 404, generic → 500.

**Caching:** `@cached` decorator applied to `get_earnings_history()`, same 15-min TTL.

---

## Frontend

### New TypeScript type

In `frontend/src/types/financial.ts`:

```typescript
export interface EarningsHistoryResponse {
  symbol: string;
  quarters: string[];
  estimated_eps: (number | null)[];
  actual_eps: (number | null)[];
  surprise: (number | null)[];
  surprise_pct: (number | null)[];
  beat: (boolean | null)[];
}
```

### New API client function

In `frontend/src/api/client.ts`:

```typescript
export function getEarningsHistory(symbol: string): Promise<EarningsHistoryResponse>
```

Calls `GET /api/v1/ticker/{symbol}/earnings-history`.

### Store changes

In `frontend/src/store/dashboardStore.tsx`:

- Add `earnings: EarningsHistoryResponse | null` to state (initial value: `null`).
- Add `SET_EARNINGS` action that sets `state.earnings`.
- `SET_SYMBOL` resets `earnings` to `null`.
- `Tab` type extended: `'income' | 'balance' | 'cashflow' | 'ratios' | 'earnings'`.

### Hook changes

In `frontend/src/hooks/useFinancials.ts`:

- Add `getEarningsHistory(symbol)` to the existing `Promise.all()`.
- On success, dispatch `SET_EARNINGS`.

### New components

**`frontend/src/components/financials/EarningsChart.tsx`**

- Recharts `ComposedChart` with two `Bar` groups per quarter: Estimated EPS (gray/neutral) and Actual EPS (green if beat, red if miss).
- X-axis: quarter labels. Y-axis: EPS in dollars.
- Custom tooltip showing: Quarter, Est. EPS, Actual EPS, Surprise $, Surprise %.
- Same visual style (dark background, custom tooltip, responsive container) as existing charts.

**`frontend/src/components/financials/EarningsTable.tsx`**

- 5-column table: Quarter | Est. EPS | Actual EPS | Surprise $ | Surprise %.
- Beat rows: actual EPS cell highlighted green. Miss rows: red.
- Surprise % shown with `+` prefix for beats (e.g., `+1.57%`).
- Same sticky-left-column and alternating-row style as `FinancialsTable`.

### Tab integration

- `TabBar.tsx`: Add `{ id: 'earnings', label: 'Earnings' }` as the 5th tab.
- `App.tsx` (Dashboard content area): Add `case 'earnings'` to render `<EarningsChart>` above `<EarningsTable>`.

---

## Data flow

```
User clicks "Earnings" tab
  → activeTab = 'earnings' (already loaded via Promise.all on symbol set)
  → EarningsChart renders grouped bar chart
  → EarningsTable renders below chart
```

No additional API call is needed when switching to the Earnings tab — data is already fetched alongside the other 5 calls when the symbol is set.

---

## Edge cases

| Situation | Behaviour |
|---|---|
| Ticker has fewer than 16 quarters of history | Return whatever is available (no padding) |
| `EPS Estimate` is NaN for a quarter | Pass `null` in arrays; chart skips bar, table shows `—` |
| `get_earnings_dates()` raises exception | Caught by router → 500 with error message |
| yfinance column name changes | Verify with `ticker.get_earnings_dates(limit=5).columns.tolist()` |
