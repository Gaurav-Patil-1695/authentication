const API_BASE = '/api';

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterResponse {
  accessToken: string;
  user: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface MeResponse {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...options,
  });

  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      throw new Error(`HTTP error ${response.status}`);
    }
    const err = Object.assign(new Error(errorData.error?.message ?? 'Unknown error'), {
      apiError: errorData,
    });
    throw err;
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>('POST', '/auth/login', data);
}

export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  return request<RegisterResponse>('POST', '/auth/register', data);
}

export async function forgotPassword(data: ForgotPasswordRequest): Promise<void> {
  return request<void>('POST', '/auth/forgot-password', data);
}

export async function resetPassword(data: ResetPasswordRequest): Promise<void> {
  return request<void>('POST', '/auth/reset-password', data);
}

export async function me(): Promise<MeResponse> {
  return request<MeResponse>('GET', '/auth/me');
}

export async function logout(): Promise<void> {
  return request<void>('POST', '/auth/logout');
}

export async function refresh(): Promise<RefreshResponse> {
  return request<RefreshResponse>('POST', '/auth/refresh');
}
