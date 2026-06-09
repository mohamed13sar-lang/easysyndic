import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AuthSession, AuthUser } from '@/services/auth-service';

export const TOKEN_KEY = 'easysyndic.auth.token';
export const USER_KEY = 'easysyndic.auth.user';

async function isSecureStoreAvailable() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function setSecureItem(key: string, value: string) {
  if (!(await isSecureStoreAvailable())) {
    setFallbackItem(key, value);
    return;
  }

  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.warn(`[auth-storage] failed to save ${key}`, error);
  }
}

async function getSecureItem(key: string) {
  if (!(await isSecureStoreAvailable())) {
    return getFallbackItem(key);
  }

  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.warn(`[auth-storage] failed to load ${key}`, error);
    return null;
  }
}

async function deleteSecureItem(key: string) {
  if (!(await isSecureStoreAvailable())) {
    deleteFallbackItem(key);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn(`[auth-storage] failed to delete ${key}`, error);
  }
}

function getFallbackStorage() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function setFallbackItem(key: string, value: string) {
  try {
    getFallbackStorage()?.setItem(key, value);
  } catch (error) {
    console.warn(`[auth-storage] failed to save fallback ${key}`, error);
  }
}

function getFallbackItem(key: string) {
  try {
    return getFallbackStorage()?.getItem(key) ?? null;
  } catch (error) {
    console.warn(`[auth-storage] failed to load fallback ${key}`, error);
    return null;
  }
}

function deleteFallbackItem(key: string) {
  try {
    getFallbackStorage()?.removeItem(key);
  } catch (error) {
    console.warn(`[auth-storage] failed to delete fallback ${key}`, error);
  }
}

function isValidUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const user = value as Partial<AuthUser>;
  return (
    typeof user.id === 'string' &&
    typeof user.fullName === 'string' &&
    typeof user.phone === 'string' &&
    typeof user.role === 'string' &&
    typeof user.isActive === 'boolean'
  );
}

export async function saveSession(session: AuthSession) {
  await Promise.all([
    setSecureItem(TOKEN_KEY, session.accessToken),
    setSecureItem(USER_KEY, JSON.stringify(session.user)),
  ]);
}

export async function loadSession(): Promise<AuthSession | null> {
  const [accessToken, userJson] = await Promise.all([
    getSecureItem(TOKEN_KEY),
    getSecureItem(USER_KEY),
  ]);

  if (!accessToken || !userJson) {
    return null;
  }

  try {
    const user = JSON.parse(userJson) as unknown;

    if (!isValidUser(user)) {
      console.log('[auth-storage] invalid stored user shape, clearing session');
      await clearSession();
      return null;
    }

    return {
      accessToken,
      user,
    };
  } catch (error) {
    console.log('[auth-storage] corrupted stored user json, clearing session', error);
    await clearSession();
    return null;
  }
}

export async function clearSession() {
  await Promise.all([deleteSecureItem(TOKEN_KEY), deleteSecureItem(USER_KEY)]);
}
