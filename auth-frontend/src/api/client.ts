import { ApiError } from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function drainQueue(token: string | null): void {
  refreshQueue.forEach((resolve) => resolve(token));
  refreshQueue = [];
}

async function attemptSilentRefresh(): Promise<string | null> {
  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const token: string | null = data?.access_token ?? null;
    return token;
  } catch {
    return null;
  }
}

function getAccessToken(): string | null {
  return sessionStorage.getItem('access_token');
}

function setAccessToken(token: string | null): void {
  if (token === null) {
    sessionStorage.removeItem('access_token');
  } else {
    sessionStorage.setItem('access_token', token);
  }
}

export { getAccessToken, setAccessToken };

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (response.status === 401 && retry) {
    if (isRefreshing) {
      const newToken = await new Promise<string | null>((resolve) => {
        refreshQueue.push(resolve);
      });
      if (newToken) {
        return request<T>(path, options, false);
      }
      throw new ApiError(401, 'UNAUTHORIZED', 'Session expired. Please log in again.', {});
    }

    isRefreshing = true;
    const newToken = await attemptSilentRefresh();
    isRefreshing = false;

    if (newToken) {
      setAccessToken(newToken);
      drainQueue(newToken);
      return request<T>(path, options, false);
    } else {
      setAccessToken(null);
      drainQueue(null);
      throw new ApiError(401, 'UNAUTHORIZED', 'Session expired. Please log in again.', {});
    }
  }

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = {};
    }

    const body = errorBody as {
      error?: { code?: string; message?: string; details?: Record<string, unknown> };
    };

    const code = body?.error?.code ?? 'UNKNOWN_ERROR';
    const message = body?.error?.message ?? 'An unexpected error occurred.';
    const details = body?.error?.details ?? {};

    throw new ApiError(response.status, code, message, details);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

export const client = {
  get<T>(path: string, options?: RequestInit): Promise<T> {
    return request<T>(path, { ...options, method: 'GET' });
  },

  post<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return request<T>(path, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return request<T>(path, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string, options?: RequestInit): Promise<T> {
    return request<T>(path, { ...options, method: 'DELETE' });
  },
};
