import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { login as apiLogin, register as apiRegister, logout as apiLogout, me as apiMe, refresh as apiRefresh } from '../api/auth';
import type { User, LoginRequest, RegisterRequest } from '../api/types';
import { getAccessToken, setAccessToken, clearAccessToken } from './tokenStore';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    try {
      const response = await apiRefresh();
      setAccessToken(response.accessToken);
      const currentUser = await apiMe();
      setUser(currentUser);
    } catch {
      clearAccessToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const token = getAccessToken();
      if (token) {
        try {
          const currentUser = await apiMe();
          setUser(currentUser);
        } catch {
          try {
            await refresh();
          } catch {
            clearAccessToken();
            setUser(null);
          }
        }
      } else {
        try {
          await refresh();
        } catch {
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    init();
  }, [refresh]);

  const login = useCallback(async (data: LoginRequest) => {
    const response = await apiLogin(data);
    setAccessToken(response.accessToken);
    const currentUser = await apiMe();
    setUser(currentUser);
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const response = await apiRegister(data);
    setAccessToken(response.accessToken);
    const currentUser = await apiMe();
    setUser(currentUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      clearAccessToken();
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      register,
      logout,
      refresh,
    }),
    [user, isLoading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
