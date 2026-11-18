// One small helper for every call to our Express API.
//
//   const trainers = await api('/trainers');
//   await api('/appointments', { method: 'POST', body: { trainerId, startsAt, duration } });
//
// It adds the login token, sends/receives JSON, and throws an Error with
// the server's message (and per-field messages) when the status is not 2xx.

export const TOKEN_KEY = 'fitlean_token';

export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `Request failed (${res.status})`);
    error.status = res.status;
    error.fields = data.fields || {};
    throw error;
  }
  return data;
}

// "2026-11-24 14:00:00" -> "Tue, 24 Nov 2026"  /  "2:00 pm"
export function formatDate(dateTime) {
  return new Date(dateTime.replace(' ', 'T')).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function formatTime(dateTime) {
  return new Date(dateTime.replace(' ', 'T')).toLocaleTimeString('en-IN', {
    hour: 'numeric', minute: '2-digit',
  });
}
