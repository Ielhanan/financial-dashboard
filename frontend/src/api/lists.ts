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
