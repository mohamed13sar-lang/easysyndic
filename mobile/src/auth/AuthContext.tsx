import { createContext, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/lib/api/client';
import { getCurrentUser, type AuthSession, type AuthUser } from '@/services/auth-service';
import { clearSelectedResidenceRelationId } from '@/services/selected-residence-storage';
import { clearSelectedSyndicResidenceId } from '@/services/selected-syndic-residence-storage';
import { clearSession, loadSession, saveSession } from './session-storage';

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
  connectionError: string | null;
  signIn: (session: AuthSession) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function clearAllAuthStorage() {
  await Promise.allSettled([
    clearSession(),
    clearSelectedResidenceRelationId(),
    clearSelectedSyndicResidenceId(),
  ]);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    console.log('[auth] session restore start');

    loadSession()
      .then(async (session) => {
        if (!mounted) {
          return;
        }

        console.log('[auth] restored user role:', session?.user.role ?? 'none');
        setUser(session?.user ?? null);
        setToken(session?.accessToken ?? null);
        setConnectionError(null);

        if (!session?.accessToken) {
          return;
        }

        try {
          const freshUser = await getCurrentUser(session.accessToken);

          if (!mounted) {
            return;
          }

          console.log('[auth] validated restored user role:', freshUser.role);
          await saveSession({ accessToken: session.accessToken, user: freshUser });
          setUser(freshUser);
          setConnectionError(null);
        } catch (error: unknown) {
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            console.log('[auth] restored token rejected, clearing auth storage');
            await clearAllAuthStorage();

            if (!mounted) {
              return;
            }

            setUser(null);
            setToken(null);
            setConnectionError(null);
            return;
          }

          if (error instanceof ApiError && error.status === 0) {
            console.log('[auth] server unreachable during restore, keeping stored session');
            setConnectionError('Serveur inaccessible');
            return;
          }

          console.log('[auth] token validation skipped, keeping stored session');
          setConnectionError('Serveur inaccessible');
        }
      })
      .catch(async (error: unknown) => {
        console.log('[auth] session restore failed, clearing auth storage', error);
        await clearAllAuthStorage();

        if (!mounted) {
          return;
        }

        setUser(null);
        setToken(null);
        setConnectionError(null);
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = useCallback(async (session: AuthSession) => {
    setIsLoggingOut(false);
    setConnectionError(null);
    await saveSession(session);
    setUser(session.user);
    setToken(session.accessToken);
  }, []);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    setUser(null);
    setToken(null);
    setConnectionError(null);

    try {
      console.log('[auth] logout clearing auth storage');
      await clearAllAuthStorage();
    } finally {
      setIsLoggingOut(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      isLoggingOut,
      connectionError,
      signIn,
      logout,
    }),
    [connectionError, isLoading, isLoggingOut, logout, signIn, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
