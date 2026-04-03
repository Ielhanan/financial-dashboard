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

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
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
  register: (email: string, name: string, password: string) =>
    post<User>('/api/v1/auth/register', { email, name, password }),
  login: (email: string, password: string) =>
    post<User>('/api/v1/auth/login', { email, password }),
};
