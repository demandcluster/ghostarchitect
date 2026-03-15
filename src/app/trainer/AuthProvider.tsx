'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthState {
  accessToken: string | null;
  trainerId: string | null;
  username: string | null;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Fetch wrapper that injects Authorization header and handles token refresh. */
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState<AuthState>({
    accessToken: null,
    trainerId: null,
    username: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json();
      setAuth((prev) => ({ ...prev, accessToken: data.accessToken }));
      return data.accessToken as string;
    } catch {
      return null;
    }
  }, []);

  // On mount, try to restore session via refresh cookie
  useEffect(() => {
    (async () => {
      const token = await refreshAccessToken();
      if (!token && pathname !== '/trainer') {
        router.replace('/trainer');
      }
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Login failed');
      }
      const data = await res.json();
      setAuth({
        accessToken: data.accessToken,
        trainerId: data.id,
        username: data.username,
      });
      router.push('/trainer/dashboard');
    },
    [router],
  );

  const logout = useCallback(async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    setAuth({ accessToken: null, trainerId: null, username: null });
    router.replace('/trainer');
  }, [router]);

  const authFetch = useCallback(
    async (url: string, init?: RequestInit): Promise<Response> => {
      const doFetch = (token: string) =>
        fetch(url, {
          ...init,
          credentials: 'include',
          headers: {
            ...init?.headers,
            Authorization: `Bearer ${token}`,
          },
        });

      if (auth.accessToken) {
        const res = await doFetch(auth.accessToken);
        if (res.status !== 401) return res;
      }

      // Try refresh
      const newToken = await refreshAccessToken();
      if (!newToken) {
        router.replace('/trainer');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
      return doFetch(newToken);
    },
    [auth.accessToken, refreshAccessToken, router],
  );

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, authFetch, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
