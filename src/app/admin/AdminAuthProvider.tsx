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

interface AdminAuthState {
  accessToken: string | null;
  adminUsername: string | null;
}

interface AdminAuthContextValue extends AdminAuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Fetch wrapper that injects Authorization header and handles token refresh. */
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  isLoading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState<AdminAuthState>({
    accessToken: null,
    adminUsername: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/admin/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
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
      if (!token && pathname !== '/admin') {
        router.replace('/admin');
      }
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Login failed');
      }
      const data = await res.json();
      setAuth({
        accessToken: (data as { accessToken: string }).accessToken,
        adminUsername: (data as { username: string }).username,
      });
      router.push('/admin/dashboard');
    },
    [router],
  );

  const logout = useCallback(async () => {
    await fetch('/api/admin/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
    setAuth({ accessToken: null, adminUsername: null });
    router.replace('/admin');
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

      // Try refresh once
      const newToken = await refreshAccessToken();
      if (!newToken) {
        router.replace('/admin');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
      return doFetch(newToken);
    },
    [auth.accessToken, refreshAccessToken, router],
  );

  return (
    <AdminAuthContext.Provider
      value={{ ...auth, login, logout, authFetch, isLoading }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}
