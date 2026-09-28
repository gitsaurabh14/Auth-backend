const TOKEN_KEY = 'atelier.accessToken';

function apiBase() {
  return import.meta.env.VITE_API_URL || '';
}

export function getAccessToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message, status, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function parseBody(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function refreshAccessToken() {
  const response = await fetch(`${apiBase()}/api/auth/refresh-token`, {
    method: 'POST',
    credentials: 'include'
  });
  const data = await parseBody(response);
  if (!response.ok) return null;
  setAccessToken(data.accessToken);
  return data.accessToken;
}

export async function request(path, options = {}, { retry = true } = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${apiBase()}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (response.status === 401 && retry && path !== '/api/auth/refresh-token' && path !== '/api/auth/login') {
    const next = await refreshAccessToken();
    if (next) return request(path, options, { retry: false });
  }

  const data = await parseBody(response);
  if (!response.ok) {
    const errors = data?.errors || [];
    const message = errors.length
      ? errors.map((item) => item.message).join(' ')
      : data?.message || 'Request failed.';
    throw new ApiError(message, response.status, errors);
  }
  return data;
}

export const api = {
  health: () => request('/api/health'),
  register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
  products: () => request('/api/products'),
  product: (id) => request(`/api/products/${id}`),
  createProduct: (body) => request('/api/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id, body) => request(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProduct: (id) => request(`/api/products/${id}`, { method: 'DELETE' })
};
