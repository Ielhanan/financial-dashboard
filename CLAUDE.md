# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Agent Instructions

You're working inside the **WAT framework** (Workflows, Agents, Tools). This architecture separates concerns so that probabilistic AI handles reasoning while deterministic code handles execution.

## The WAT Architecture

**Layer 1: Workflows (`workflows/`)** — Markdown SOPs defining objective, required inputs, which tools to use, expected outputs, and edge case handling.

**Layer 2: Agents (you)** — Intelligent coordination. Read the relevant workflow, run tools in the correct sequence, handle failures, and ask clarifying questions when needed. Do not execute tasks directly when a tool exists for it.

**Layer 3: Tools (`tools/`)** — Python scripts that do the actual work: API calls, data transformations, file operations, database queries. Credentials live in `.env`.

**Why this separation matters:** Each direct AI step has ~90% accuracy. Five steps = 59% end-to-end success. Offloading execution to deterministic scripts keeps you focused on orchestration.

---

## How to Operate

**Before doing anything:** Check `workflows/` for an existing SOP and `tools/` for an existing script. Only create new files when nothing covers the task.

**Running tools:**

```bash
python tools/<script_name>.py [args]
```

**When a tool fails:**

1. Read the full error trace
2. Fix the script and retest
3. If the fix requires paid API calls or credits, confirm with the user before re-running
4. Update the workflow with what you learned (rate limits, batch endpoints, timing quirks)

**Workflow files:** Do not create or overwrite workflow files without explicit instruction. They are standing instructions that must be preserved and refined.

---

## File Structure

```text
.tmp/              # Temporary processing files — disposable, regenerate as needed
tools/             # Python scripts for deterministic execution
workflows/         # Markdown SOPs
backend/           # FastAPI app (deployed to Railway)
frontend/          # React/Vite app (deployed to Vercel)
.env               # API keys and credentials (never store secrets elsewhere)
credentials.json   # Google OAuth (gitignored)
token.json         # Google OAuth token (gitignored)
```

**Output destinations:** Deliverables go to cloud services (Google Sheets, Slides, etc.) — not local files. Local files in `.tmp/` are intermediates only.

---

## Financial Dashboard App

The repo also contains a full-stack financial dashboard. See `workflows/financial_dashboard.md` for the authoritative architecture doc. Key points:

- **Data source:** Yahoo Finance via `yfinance` — no API key required
- **Cache:** In-process `TTLCache`, 15-minute TTL, 200 entries (`backend/services/cache.py`)
- **Vite proxy:** `/api/*` requests from the frontend are proxied to `http://localhost:8000` in dev (configured in `vite.config.ts`)

### Dev Commands

```bash
# Backend (from wag/backend/)
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# Frontend (from wag/frontend/)
npm install
npm run dev       # Vite dev server at http://localhost:5173
npm run build     # tsc + vite build → dist/
npm run lint      # ESLint
```

### Backend Architecture

All yfinance calls are isolated in `backend/services/yfinance_client.py`. Everything else in the backend imports from there — never import `yfinance` directly in a router.

**Adding a new financial metric:**

1. Add the yfinance field name to the relevant `*_KEYS` list in `yfinance_client.py`
2. Add a human-readable entry to the corresponding `*_LABELS` dict
3. Add the format (`"currency"`, `"ratio"`, `"percent"`) to `*_FORMATS`
4. Add the field to `HEADER_ROWS` in `frontend/src/components/financials/FinancialsTable.tsx` if it's a key summary line

**Adding a new ratio:**

1. Add a `(yfinance_key, label, format)` tuple to `ratio_defs` in `yfinance_client.get_ratios()`
2. Add the key to the appropriate group in `frontend/src/components/financials/KeyRatios.tsx`

### Frontend Architecture

State flows through a single Zustand-style store at `frontend/src/store/dashboardStore.tsx`. The `useFinancials` hook (`frontend/src/hooks/useFinancials.ts`) fires 6 parallel `Promise.all()` requests to the FastAPI backend whenever the ticker symbol changes.

**Data flow:** `TickerSearch` → dispatches `SET_SYMBOL` → `useFinancials` fetches all endpoints → store updates → chart/table components re-render.

API calls are centralized in `frontend/src/api/client.ts`. Do not call `fetch` directly from components.

---

## Workflow File Format

Each workflow in `workflows/` should cover:

- **Objective** — what this workflow accomplishes
- **Inputs** — what parameters or data are required
- **Steps** — ordered sequence referencing specific tool scripts
- **Outputs** — what gets produced and where it goes
- **Edge cases** — known failure modes and how to handle them

---

## Self-Improvement Loop

When something breaks: fix the tool → verify the fix → update the workflow. Every failure should make the system more robust for next time.
