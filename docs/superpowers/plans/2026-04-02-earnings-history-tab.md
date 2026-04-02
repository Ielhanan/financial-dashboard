# Earnings History Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 5th "Earnings" tab showing quarterly EPS estimates vs actuals (past ~16 quarters) as both a grouped bar chart and a data table.

**Architecture:** New backend endpoint `GET /api/v1/ticker/{symbol}/earnings-history` fetches from yfinance `get_earnings_dates()`, transforms to a flat parallel-array response, and is cached like all other endpoints. The frontend adds a new `EarningsHistoryResponse` type, extends `Tab` to include `'earnings'`, stores earnings data separately from the `financials` record (which only holds `FinancialRow[]` data), fetches in the existing `Promise.all`, and renders `EarningsChart` above `EarningsTable` in the new tab.

**Tech Stack:** Python/FastAPI (backend), React/TypeScript/Recharts/Tailwind (frontend), yfinance `get_earnings_dates(limit=20)`

---

### Task 1: Backend service — `get_earnings_history()`

**Files:**
- Modify: `backend/services/yfinance_client.py` (append after `get_charts`)

- [ ] **Step 1: Add `get_earnings_history` to yfinance_client.py**

Append to the end of `backend/services/yfinance_client.py`:

```python
@cached
def get_earnings_history(symbol: str) -> dict:
    t = _ticker(symbol)
    df = t.get_earnings_dates(limit=20)

    if df is None or df.empty:
        raise ValueError(f"No earnings history for '{symbol}'")

    # Drop rows with no reported EPS (future scheduled dates)
    df = df.dropna(subset=["Reported EPS"])

    # Keep most recent 16 quarters, then reverse to chronological order
    df = df.head(16).iloc[::-1]

    quarters = [_format_quarterly_date(ts) for ts in df.index]

    def _val(series, idx):
        v = series.iloc[idx]
        return None if pd.isna(v) else round(float(v), 4)

    estimated_eps = [_val(df["EPS Estimate"], i) for i in range(len(df))]
    actual_eps    = [_val(df["Reported EPS"], i) for i in range(len(df))]
    surprise_pct  = [_val(df["Surprise(%)"], i) for i in range(len(df))]

    surprise = [
        round(a - e, 4) if a is not None and e is not None else None
        for a, e in zip(actual_eps, estimated_eps)
    ]
    beat = [
        a >= e if a is not None and e is not None else None
        for a, e in zip(actual_eps, estimated_eps)
    ]

    return {
        "quarters":      quarters,
        "estimated_eps": estimated_eps,
        "actual_eps":    actual_eps,
        "surprise":      surprise,
        "surprise_pct":  surprise_pct,
        "beat":          beat,
    }
```

- [ ] **Step 2: Verify yfinance column names**

From `backend/`, run:
```bash
python -c "
import yfinance as yf
t = yf.Ticker('AAPL')
df = t.get_earnings_dates(limit=5)
print(df.columns.tolist())
print(df.head(3))
"
```

Expected output includes columns: `['EPS Estimate', 'Reported EPS', 'Surprise(%)']`

If column names differ, update the key strings in `get_earnings_history()` to match.

- [ ] **Step 3: Commit**

```bash
git add backend/services/yfinance_client.py
git commit -m "feat: add get_earnings_history to yfinance_client"
```

---

### Task 2: Backend router + main.py registration

**Files:**
- Create: `backend/routers/earnings.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Create `backend/routers/earnings.py`**

```python
from fastapi import APIRouter, HTTPException
from services import yfinance_client

router = APIRouter()


@router.get("/ticker/{symbol}/earnings-history")
def get_earnings_history(symbol: str):
    try:
        data = yfinance_client.get_earnings_history(symbol.upper())
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch earnings history.")
    return {"symbol": symbol.upper(), **data}
```

- [ ] **Step 2: Register router in `backend/main.py`**

Change:
```python
from routers import search, financials, ratios
```
To:
```python
from routers import search, financials, ratios, earnings
```

And add after the existing `app.include_router` calls:
```python
app.include_router(earnings.router,    prefix="/api/v1")
```

- [ ] **Step 3: Smoke-test the endpoint**

Start the backend (`python -m uvicorn main:app --reload --port 8000`) and run:
```bash
curl "http://localhost:8000/api/v1/ticker/AAPL/earnings-history"
```

Expected: JSON with keys `symbol`, `quarters`, `estimated_eps`, `actual_eps`, `surprise`, `surprise_pct`, `beat` and 8–16 entries per array.

- [ ] **Step 4: Commit**

```bash
git add backend/routers/earnings.py backend/main.py
git commit -m "feat: add earnings-history endpoint"
```

---

### Task 3: Frontend types + API client

**Files:**
- Modify: `frontend/src/types/financial.ts`
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Update `frontend/src/types/financial.ts`**

Replace:
```typescript
export type Period = 'annual' | 'quarterly';
export type Tab = 'income' | 'balance' | 'cashflow' | 'ratios';
```
With:
```typescript
export type Period = 'annual' | 'quarterly';
export type FinancialTab = 'income' | 'balance' | 'cashflow' | 'ratios';
export type Tab = FinancialTab | 'earnings';
```

Append at the end of the file:
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

- [ ] **Step 2: Add `getEarningsHistory` to `frontend/src/api/client.ts`**

Replace:
```typescript
import type { ChartsResponse, FinancialsResponse, Period, RatiosResponse, TickerInfo } from '../types/financial';
```
With:
```typescript
import type { ChartsResponse, EarningsHistoryResponse, FinancialsResponse, Period, RatiosResponse, TickerInfo } from '../types/financial';
```

Add inside the `api` object, after `getCharts`:
```typescript
  getEarningsHistory: (symbol: string) =>
    get<EarningsHistoryResponse>(`/api/v1/ticker/${symbol}/earnings-history`),
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/financial.ts frontend/src/api/client.ts
git commit -m "feat: add EarningsHistoryResponse type and getEarningsHistory API call"
```

---

### Task 4: Store — add `earnings` state + `SET_EARNINGS` action

**Files:**
- Modify: `frontend/src/store/dashboardStore.tsx`

- [ ] **Step 1: Update `dashboardStore.tsx`**

Replace the import line:
```typescript
import type { ChartsResponse, FinancialsResponse, Period, RatiosResponse, Tab, TickerInfo } from '../types/financial';
```
With:
```typescript
import type { ChartsResponse, EarningsHistoryResponse, FinancialTab, FinancialsResponse, Period, RatiosResponse, Tab, TickerInfo } from '../types/financial';
```

Replace the `State` interface:
```typescript
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
}
```

Update `SET_FINANCIALS` in the `Action` union to use `FinancialTab` (not `Tab`) so `'earnings'` can never be passed as a tab to the financials record:
```typescript
  | { type: 'SET_FINANCIALS'; tab: FinancialTab; payload: FinancialsResponse }
```

Add `SET_EARNINGS` to the `Action` union (after `SET_RATIOS`):
```typescript
  | { type: 'SET_EARNINGS'; payload: EarningsHistoryResponse }
```

Replace `initialFinancials`:
```typescript
const initialFinancials: Record<FinancialTab, FinancialsResponse | null> = {
  income: null, balance: null, cashflow: null, ratios: null,
};
```

Replace `initialState`:
```typescript
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
};
```

Add `SET_EARNINGS` case in the reducer (after `SET_RATIOS`):
```typescript
    case 'SET_EARNINGS':
      return { ...state, earnings: action.payload };
```

- [ ] **Step 2: Verify TypeScript compiles**

From `frontend/`:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/store/dashboardStore.tsx
git commit -m "feat: add earnings state and SET_EARNINGS action to store"
```

---

### Task 5: `useFinancials` hook — add earnings fetch

**Files:**
- Modify: `frontend/src/hooks/useFinancials.ts`

- [ ] **Step 1: Update `useFinancials.ts`**

Replace the entire file content:
```typescript
import { useEffect } from 'react';
import { api } from '../api/client';
import { useDashboard } from '../store/dashboardStore';

export function useFinancials() {
  const { state, dispatch } = useDashboard();

  useEffect(() => {
    if (!state.symbol) return;

    const symbol = state.symbol;
    const period = state.period;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    Promise.all([
      api.getInfo(symbol),
      api.getIncomeStatement(symbol, period),
      api.getBalanceSheet(symbol, period),
      api.getCashFlow(symbol, period),
      api.getRatios(symbol),
      api.getCharts(symbol, period),
      api.getEarningsHistory(symbol),
    ])
      .then(([info, income, balance, cashflow, ratios, charts, earnings]) => {
        dispatch({ type: 'SET_INFO',       payload: info });
        dispatch({ type: 'SET_FINANCIALS', tab: 'income',   payload: income });
        dispatch({ type: 'SET_FINANCIALS', tab: 'balance',  payload: balance });
        dispatch({ type: 'SET_FINANCIALS', tab: 'cashflow', payload: cashflow });
        dispatch({ type: 'SET_RATIOS',     payload: ratios });
        dispatch({ type: 'SET_CHARTS',     payload: charts });
        dispatch({ type: 'SET_EARNINGS',   payload: earnings });
        dispatch({ type: 'SET_LOADING',    payload: false });
      })
      .catch((e: Error) => {
        dispatch({ type: 'SET_ERROR', payload: e.message });
      });
  }, [state.symbol, state.period]);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

From `frontend/`:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useFinancials.ts
git commit -m "feat: add getEarningsHistory to useFinancials Promise.all"
```

---

### Task 6: `EarningsChart` component

**Files:**
- Create: `frontend/src/components/financials/EarningsChart.tsx`

- [ ] **Step 1: Create `frontend/src/components/financials/EarningsChart.tsx`**

```tsx
import { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { EarningsHistoryResponse } from '../../types/financial';

interface Props { earnings: EarningsHistoryResponse }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const est  = payload.find((p: any) => p.dataKey === 'estimated');
  const act  = payload.find((p: any) => p.dataKey === 'actual');
  const beat = act?.payload?.beat;
  const surp = act?.payload?.surprise;
  const surpPct = act?.payload?.surprisePct;
  return (
    <div className="bg-bg-elevated border border-border-bright rounded px-3 py-2 text-sm shadow-lg min-w-[160px]">
      <div className="text-text-secondary mb-1">{label}</div>
      {est && (
        <div className="font-numbers text-text-secondary">
          Est: ${est.value?.toFixed(2) ?? '—'}
        </div>
      )}
      {act && (
        <div className={`font-numbers font-medium ${beat ? 'text-positive' : 'text-negative'}`}>
          Act: ${act.value?.toFixed(2) ?? '—'}
        </div>
      )}
      {surp != null && (
        <div className={`font-numbers text-xs mt-1 ${beat ? 'text-positive' : 'text-negative'}`}>
          {beat ? '+' : ''}{surp.toFixed(2)} ({beat ? '+' : ''}{surpPct?.toFixed(2)}%)
        </div>
      )}
    </div>
  );
};

export default function EarningsChart({ earnings }: Props) {
  const data = useMemo(() =>
    earnings.quarters.map((q, i) => ({
      quarter:     q,
      estimated:   earnings.estimated_eps[i],
      actual:      earnings.actual_eps[i],
      beat:        earnings.beat[i],
      surprise:    earnings.surprise[i],
      surprisePct: earnings.surprise_pct[i],
    })),
  [earnings]);

  return (
    <div className="bg-bg-surface border border-border rounded p-4">
      <div className="text-[11px] uppercase tracking-widest text-text-secondary font-medium mb-4">
        EPS Estimate vs Actual ($)
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2d40" vertical={false} />
          <XAxis dataKey="quarter" tick={{ fill: '#8899aa', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#8899aa', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} width={45} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#8899aa' }} />
          <Bar dataKey="estimated" name="Estimated EPS" fill="#4a5568" radius={[3, 3, 0, 0]} />
          <Bar dataKey="actual" name="Actual EPS" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.beat ? '#22d15e' : '#f04e4e'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

From `frontend/`:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/financials/EarningsChart.tsx
git commit -m "feat: add EarningsChart grouped bar component"
```

---

### Task 7: `EarningsTable` component

**Files:**
- Create: `frontend/src/components/financials/EarningsTable.tsx`

- [ ] **Step 1: Create `frontend/src/components/financials/EarningsTable.tsx`**

```tsx
import type { EarningsHistoryResponse } from '../../types/financial';

interface Props { earnings: EarningsHistoryResponse }

function fmtEps(v: number | null): string {
  if (v == null) return '—';
  return `$${v.toFixed(2)}`;
}

function fmtSurprise(v: number | null, beat: boolean | null): string {
  if (v == null) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}$${v.toFixed(2)}`;
}

function fmtSurprisePct(v: number | null, beat: boolean | null): string {
  if (v == null) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}

export default function EarningsTable({ earnings }: Props) {
  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-bg-elevated">
            {['Quarter', 'Est. EPS', 'Actual EPS', 'Surprise $', 'Surprise %'].map((h) => (
              <th
                key={h}
                className="px-4 py-2.5 text-[11px] uppercase tracking-widest text-text-secondary font-medium border-b border-border whitespace-nowrap text-right first:text-left"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {earnings.quarters.map((q, i) => {
            const beat = earnings.beat[i];
            const actual = earnings.actual_eps[i];
            const estimated = earnings.estimated_eps[i];
            const surprise = earnings.surprise[i];
            const surprisePct = earnings.surprise_pct[i];
            return (
              <tr
                key={q}
                className={`border-b border-border transition-colors hover:bg-bg-hover ${
                  i % 2 === 0 ? 'bg-bg-base' : 'bg-bg-surface'
                }`}
              >
                <td className="px-4 py-2 text-text-secondary whitespace-nowrap">{q}</td>
                <td className="px-4 py-2 text-right font-numbers text-text-secondary whitespace-nowrap">
                  {fmtEps(estimated)}
                </td>
                <td className={`px-4 py-2 text-right font-numbers font-medium whitespace-nowrap ${
                  beat === true ? 'text-positive' : beat === false ? 'text-negative' : 'text-text-secondary'
                }`}>
                  {fmtEps(actual)}
                </td>
                <td className={`px-4 py-2 text-right font-numbers whitespace-nowrap ${
                  beat === true ? 'text-positive' : beat === false ? 'text-negative' : 'text-text-secondary'
                }`}>
                  {fmtSurprise(surprise, beat)}
                </td>
                <td className={`px-4 py-2 text-right font-numbers whitespace-nowrap ${
                  beat === true ? 'text-positive' : beat === false ? 'text-negative' : 'text-text-secondary'
                }`}>
                  {fmtSurprisePct(surprisePct, beat)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

From `frontend/`:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/financials/EarningsTable.tsx
git commit -m "feat: add EarningsTable component"
```

---

### Task 8: Wire up TabBar + App.tsx

**Files:**
- Modify: `frontend/src/components/ui/TabBar.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Update `TabBar.tsx` — add Earnings tab**

Replace the `TABS` array:
```typescript
const TABS: { id: Tab; label: string }[] = [
  { id: 'income',   label: 'Income Statement' },
  { id: 'balance',  label: 'Balance Sheet' },
  { id: 'cashflow', label: 'Cash Flow' },
  { id: 'ratios',   label: 'Key Ratios' },
  { id: 'earnings', label: 'Earnings' },
];
```

- [ ] **Step 2: Update `App.tsx` — import new components and add earnings case**

Add imports after the existing import block:
```typescript
import EarningsChart from './components/financials/EarningsChart';
import EarningsTable from './components/financials/EarningsTable';
```

Update the destructure line in `Dashboard`:
```typescript
const { symbol, info, financials, charts, ratios, earnings, loading, error, activeTab } = state;
```

Replace the tab content block (the `<div className="pb-8">` section):
```tsx
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
```

- [ ] **Step 3: Verify TypeScript compiles**

From `frontend/`:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Full dev test**

Start both servers:
```bash
# Terminal 1
cd backend && python -m uvicorn main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
```

Open `http://localhost:5173`, search for `AAPL`, click the **Earnings** tab. Verify:
- Grouped bar chart appears with gray (Estimated) and green/red (Actual) bars
- Table below shows Quarter / Est. EPS / Actual EPS / Surprise $ / Surprise % columns
- Beat rows show green actual EPS, miss rows show red
- Tooltip on chart hover shows all 5 values

- [ ] **Step 5: Final commit**

```bash
git add frontend/src/components/ui/TabBar.tsx frontend/src/App.tsx
git commit -m "feat: wire up Earnings tab in TabBar and App"
```
