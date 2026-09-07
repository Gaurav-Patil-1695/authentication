const API_BASE = process.env.REACT_APP_API_URL ?? 'http://localhost:8000';

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface UserResponse {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  tokenType: string;
  user: UserResponse;
}

export interface MessageResponse {
  message: string;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: { message: 'An unexpected error occurred.' } };
    }
    throw errorData;
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

export async function login(data: LoginRequest): Promise<AuthTokenResponse> {
  return request<AuthTokenResponse>('POST', '/auth/login', {
    email: data.email,
    password: data.password,
    remember_me: data.rememberMe ?? false,
  });
}

export async function register(data: RegisterRequest): Promise<AuthTokenResponse> {
  return request<AuthTokenResponse>('POST', '/auth/register', {
    full_name: data.fullName,
    email: data.email,
    password: data.password,
    confirm_password: data.confirmPassword,
  });
}

export async function forgotPassword(data: ForgotPasswordRequest): Promise<MessageResponse> {
  return request<MessageResponse>('POST', '/auth/forgot-password', {
    email: data.email,
  });
}

export async function resetPassword(data: ResetPasswordRequest): Promise<MessageResponse> {
  return request<MessageResponse>('POST', '/auth/reset-password', {
    token: data.token,
    password: data.password,
    confirm_password: data.confirmPassword,
  });
}

export async function me(): Promise<UserResponse> {
  return request<UserResponse>('GET', '/auth/me');
}

export async function logout(): Promise<void> {
  return request<void>('POST', '/auth/logout');
}

export async function refresh(): Promise<AuthTokenResponse> {
  return request<AuthTokenResponse>('POST', '/auth/refresh');
}
