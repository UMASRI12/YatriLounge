import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { insforgeBaseUrl, isInsforgeConfigured } from '../lib/insforgeClient';

type AuthUser = {
  id: string;
  email?: string;
  profile?: { name?: string; avatar_url?: string } & Record<string, unknown>;
  providers?: string[];
};

type AuthSession = {
  accessToken: string;
  csrfToken?: string;
  user: AuthUser;
  expiresAt?: Date;
};

type AuthState = {
  isConfigured: boolean;
  isLoading: boolean;
  session: AuthSession | null;
  user: AuthUser | null;
  error: string | null;

  signInWithGoogle: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUpWithEmailPassword: (
    email: string,
    password: string,
    name?: string
  ) => Promise<{ ok: boolean; requiresEmailVerification?: boolean; error?: string }>;
  verifyEmailCode: (email: string, otp: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function safeErrorMessage(err: unknown): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
    return (err as any).message;
  }
  return 'Something went wrong';
}

function isNoSessionError(message: string | undefined) {
  const m = (message ?? '').toLowerCase();
  return (
    m.includes('no refresh token') ||
    m.includes('refresh token provided') ||
    m.includes('no_refresh_token') ||
    m.includes('not authenticated') ||
    m.includes('no active session')
  );
}

const STORAGE_KEY = 'yatrilounge.auth.session';
const PKCE_VERIFIER_KEY = 'yatrilounge.auth.pkce_verifier';

function base64UrlEncode(bytes: ArrayBuffer) {
  const str = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256Base64Url(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(hash);
}

function randomVerifier(length = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += chars[bytes[i] % chars.length];
  return out;
}

async function fetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; error: string; status?: number }> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      credentials: 'include',
    });
    const text = await res.text();
    const json = text ? (JSON.parse(text) as any) : {};
    if (!res.ok) {
      return { ok: false, error: json?.message ?? `Request failed (${res.status})`, status: res.status };
    }
    return { ok: true, data: json as T };
  } catch (e) {
    return { ok: false, error: safeErrorMessage(e) };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = isInsforgeConfigured;

  const refresh = useCallback(async () => {
    if (!isConfigured || !insforgeBaseUrl) {
      setSession(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // 1) If returning from OAuth, exchange insforge_code for tokens.
    const url = new URL(window.location.href);
    const oauthCode = url.searchParams.get('insforge_code');
    if (oauthCode) {
      const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY) ?? '';
      if (verifier) {
        const exchange = await fetchJson<{
          user: AuthUser;
          accessToken: string;
          refreshToken?: string | null;
          csrfToken?: string | null;
          redirectTo?: string;
        }>(`${insforgeBaseUrl}/api/auth/oauth/exchange`, {
          method: 'POST',
          body: JSON.stringify({ code: oauthCode, code_verifier: verifier }),
        });

        if (exchange.ok && exchange.data?.accessToken && exchange.data?.user) {
          const nextSession: AuthSession = {
            accessToken: exchange.data.accessToken,
            user: exchange.data.user,
            csrfToken: exchange.data.csrfToken ?? undefined,
          };
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
          setSession(nextSession);
          setIsLoading(false);
          // Clean URL (remove insforge_code)
          url.searchParams.delete('insforge_code');
          window.history.replaceState({}, '', url.toString());
          return;
        }

        // If exchange failed, fall through to normal restore.
        if (!exchange.ok && !isNoSessionError(exchange.error)) {
          setError(exchange.error);
        }
      }
    }

    // 2) Load last known session (if any)
    const raw = sessionStorage.getItem(STORAGE_KEY);
    let cached: AuthSession | null = null;
    if (raw) {
      try {
        cached = JSON.parse(raw) as AuthSession;
      } catch {
        cached = null;
      }
    }

    // 3) Try refresh if we have CSRF token (web flow)
    const csrf = cached?.csrfToken;
    if (csrf) {
      const refreshed = await fetchJson<{
        user: AuthUser;
        accessToken: string;
        csrfToken?: string;
      }>(`${insforgeBaseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrf },
        body: JSON.stringify({}),
      });

      if (refreshed.ok && refreshed.data?.accessToken && refreshed.data?.user) {
        const nextSession: AuthSession = {
          accessToken: refreshed.data.accessToken,
          user: refreshed.data.user,
          csrfToken: refreshed.data.csrfToken ?? csrf,
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
        setSession(nextSession);
        setIsLoading(false);
        return;
      }

      // Invalid/expired CSRF or missing refresh cookie → treat as signed out
      sessionStorage.removeItem(STORAGE_KEY);
      setSession(null);
      setIsLoading(false);
      return;
    }

    // 4) No CSRF token to refresh with; treat as signed out
    setSession(null);
    setIsLoading(false);
  }, [isConfigured]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signInWithGoogle = useCallback(async () => {
    if (!isConfigured || !insforgeBaseUrl) {
      setError('InsForge is not configured. Set VITE_INSFORGE_BASE_URL.');
      return;
    }
    setError(null);

    // Start PKCE OAuth flow (web): get authUrl then redirect.
    const verifier = randomVerifier();
    sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
    const challenge = await sha256Base64Url(verifier);
    const redirectUri = window.location.origin;

    const start = await fetchJson<{ authUrl?: string; url?: string }>(
      `${insforgeBaseUrl}/api/auth/oauth/google?redirect_uri=${encodeURIComponent(redirectUri)}&code_challenge=${encodeURIComponent(challenge)}`,
      { method: 'GET', headers: {} }
    );

    if (!start.ok) {
      setError(start.error ?? 'Google sign-in failed');
      return;
    }

    const authUrl = (start.data as any).authUrl ?? (start.data as any).url;
    if (!authUrl) {
      setError('Google sign-in failed: missing auth URL');
      return;
    }

    window.location.href = authUrl;
  }, [isConfigured]);

  const signInWithEmailPassword = useCallback(
    async (email: string, password: string) => {
      if (!isConfigured || !insforgeBaseUrl) {
        const msg = 'InsForge is not configured. Set VITE_INSFORGE_BASE_URL.';
        setError(msg);
        return { ok: false, error: msg };
      }
      setError(null);

      const res = await fetchJson<{ user: AuthUser; accessToken: string; csrfToken?: string }>(
        `${insforgeBaseUrl}/api/auth/sessions`,
        { method: 'POST', body: JSON.stringify({ email, password }) }
      );

      if (!res.ok) {
        setError(res.error ?? 'Email sign-in failed');
        return { ok: false, error: res.error ?? 'Email sign-in failed' };
      }

      const nextSession: AuthSession = { accessToken: res.data.accessToken, user: res.data.user, csrfToken: res.data.csrfToken };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
      return { ok: true };
    },
    [isConfigured]
  );

  const signUpWithEmailPassword = useCallback(
    async (email: string, password: string, name?: string) => {
      if (!isConfigured || !insforgeBaseUrl) {
        const msg = 'InsForge is not configured. Set VITE_INSFORGE_BASE_URL.';
        setError(msg);
        return { ok: false, error: msg };
      }
      setError(null);

      const res = await fetchJson<{
        user?: AuthUser;
        accessToken?: string | null;
        csrfToken?: string | null;
        requireEmailVerification?: boolean;
      }>(`${insforgeBaseUrl}/api/auth/users`, {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      });

      if (!res.ok) {
        setError(res.error ?? 'Sign up failed');
        return { ok: false, error: res.error ?? 'Sign up failed' };
      }

      if (res.data?.requireEmailVerification) {
        return { ok: true, requiresEmailVerification: true };
      }

      if (res.data?.accessToken && res.data.user) {
        const nextSession: AuthSession = {
          accessToken: res.data.accessToken,
          user: res.data.user,
          csrfToken: res.data.csrfToken ?? undefined,
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
        setSession(nextSession);
      }

      return { ok: true, requiresEmailVerification: false };
    },
    [isConfigured]
  );

  const verifyEmailCode = useCallback(
    async (email: string, otp: string) => {
      if (!isConfigured || !insforgeBaseUrl) {
        const msg = 'InsForge is not configured. Set VITE_INSFORGE_BASE_URL.';
        setError(msg);
        return { ok: false, error: msg };
      }
      setError(null);

      const res = await fetchJson<{ user: AuthUser; accessToken: string; csrfToken?: string }>(
        `${insforgeBaseUrl}/api/auth/email/verify`,
        { method: 'POST', body: JSON.stringify({ email, otp }) }
      );

      if (!res.ok) {
        setError(res.error ?? 'Verification failed');
        return { ok: false, error: res.error ?? 'Verification failed' };
      }

      if (res.data?.accessToken && res.data.user) {
        const nextSession: AuthSession = { accessToken: res.data.accessToken, user: res.data.user, csrfToken: res.data.csrfToken };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
        setSession(nextSession);
      }
      return { ok: true };
    },
    [isConfigured]
  );

  const signOut = useCallback(async () => {
    if (!isConfigured || !insforgeBaseUrl) {
      setSession(null);
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    setError(null);
    const res = await fetchJson<{ success?: boolean; message?: string }>(`${insforgeBaseUrl}/api/auth/logout`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (!res.ok && !isNoSessionError(res.error)) setError(res.error ?? 'Sign out failed');
    setSession(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }, [isConfigured]);

  const value = useMemo<AuthState>(
    () => ({
      isConfigured,
      isLoading,
      session,
      user: session?.user ?? null,
      error,
      signInWithGoogle,
      signInWithEmailPassword,
      signUpWithEmailPassword,
      verifyEmailCode,
      signOut,
      refresh,
    }),
    [
      error,
      isConfigured,
      isLoading,
      refresh,
      session,
      signInWithEmailPassword,
      signInWithGoogle,
      signOut,
      signUpWithEmailPassword,
      verifyEmailCode,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

