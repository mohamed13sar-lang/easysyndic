import { Platform } from 'react-native';
import { getApiBaseUrl, getApiConfigError } from '@/config/runtime';

const API_URL = getApiBaseUrl();
const IS_DEV = process.env.NODE_ENV !== 'production';
const AUTH_PATHS = new Set([
  '/auth/send-otp',
  '/auth/verify-otp',
  '/auth/login',
  '/auth/me',
]);

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

function getApiUrl() {
  if (!API_URL) {
    const configError = getApiConfigError() ?? 'Serveur inaccessible';
    console.error('[api] invalid configuration', configError);
    throw new ApiError(configError, 0, { configError });
  }

  const configuredUrl = API_URL.trim().replace(/^["']|["']$/g, '').replace(/\/$/, '');

  if (Platform.OS === 'web') {
    try {
      const parsed = new URL(configuredUrl);
      const isLanHost =
        parsed.hostname.startsWith('192.168.') ||
        parsed.hostname.startsWith('10.') ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(parsed.hostname);

      if (isLanHost) {
        const localhostUrl = `${parsed.protocol}//localhost${parsed.port ? `:${parsed.port}` : ''}`;
        if (IS_DEV) {
          console.log('[api] web dev API URL normalized', {
            configuredUrl,
            finalUrl: localhostUrl,
          });
        }
        return localhostUrl;
      }
    } catch {
      return configuredUrl;
    }
  }

  return configuredUrl;
}

function isAuthRequest(path: string) {
  return AUTH_PATHS.has(path.split('?')[0]);
}

function redactAuthBody(body: unknown) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const clone = { ...(body as Record<string, unknown>) };
  for (const key of ['password', 'code']) {
    if (key in clone) {
      clone[key] = '[REDACTED]';
    }
  }

  return clone;
}

function resolveErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message;

    if (Array.isArray(message)) {
      return message.join('\n');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  return fallback;
}

function resolveHttpErrorMessage(status: number, payload: unknown) {
  if (status === 404) {
    return "Service introuvable. Vérifiez l'URL API.";
  }

  return resolveErrorMessage(payload, 'Une erreur est survenue.');
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${getApiUrl()}${path}`;
  const isAuth = isAuthRequest(path);
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;

  try {
    if (isAuth) {
      console.log('[auth-api] final URL', url);
    }

    if (IS_DEV) {
      console.log('[api] request', options.method ?? 'GET', url);
      if (isAuth) {
        console.log('[auth-api] request body', redactAuthBody(options.body));
      }
    }

    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body:
        options.body === undefined
          ? undefined
          : isFormData
            ? (options.body as BodyInit)
            : JSON.stringify(options.body),
    });
  } catch (error) {
    if (IS_DEV) {
      console.log('[api] network error', url, error);
      if (isAuth) {
        console.log('[auth-api] network error details', {
          url,
          name: error instanceof Error ? error.name : undefined,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    throw new ApiError('Serveur inaccessible.', 0, {
      url,
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  if (isAuth) {
    console.log('[auth-api] response status', response.status, url);
  }

  if (IS_DEV) {
    console.log('[api] response status', response.status, url);
  }

  const text = await response.text();
  let payload: unknown = null;

  try {
    payload = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    payload = { message: text };
  }

  if (!response.ok) {
    if (IS_DEV) {
      console.log('[api] backend error', response.status, url, payload);
    }
    throw new ApiError(resolveHttpErrorMessage(response.status, payload), response.status, payload);
  }

  return payload as T;
}
