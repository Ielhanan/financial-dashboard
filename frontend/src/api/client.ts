import type { ChartsResponse, EarningsHistoryResponse, FinancialsResponse, Period, RatiosResponse, TickerInfo } from '../types/financial';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: 'include' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getInfo: (symbol: string) =>
    get<TickerInfo>(`/api/v1/ticker/${symbol}/info`),

  getIncomeStatement: (symbol: string, period: Period) =>
    get<FinancialsResponse>(`/api/v1/ticker/${symbol}/financials?period=${period}`),

  getBalanceSheet: (symbol: string, period: Period) =>
    get<FinancialsResponse>(`/api/v1/ticker/${symbol}/balance-sheet?period=${period}`),

  getCashFlow: (symbol: string, period: Period) =>
    get<FinancialsResponse>(`/api/v1/ticker/${symbol}/cash-flow?period=${period}`),

  getRatios: (symbol: string) =>
    get<RatiosResponse>(`/api/v1/ticker/${symbol}/ratios`),

  getCharts: (symbol: string, period: Period) =>
    get<ChartsResponse>(`/api/v1/ticker/${symbol}/charts?period=${period}`),

  getEarningsHistory: (symbol: string) =>
    get<EarningsHistoryResponse>(`/api/v1/ticker/${symbol}/earnings-history`),
};
