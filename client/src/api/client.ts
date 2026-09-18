export function getToken(): string | null {
  return localStorage.getItem('clawback_token');
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem('clawback_token', token);
  } else {
    localStorage.removeItem('clawback_token');
  }
}

export function getStoredUser(): { id: number; email: string; name: string; role: string } | null {
  const raw = localStorage.getItem('clawback_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setStoredUser(user: { id: number; email: string; name: string; role: string } | null) {
  if (user) {
    localStorage.setItem('clawback_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('clawback_user');
  }
}

export function logout() {
  setToken(null);
  setStoredUser(null);
  localStorage.removeItem('clawback_companyFilter');
  window.location.href = '/login';
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    logout();
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}
