const API_URL_PLACEHOLDERS = new Set([
  'https://YOUR_BACKEND_URL',
  'http://YOUR_LOCAL_IP:3000',
]);

function cleanEnvValue(value: string | undefined) {
  return value?.trim().replace(/^["']|["']$/g, '').replace(/\/$/, '') ?? '';
}

export function getApiBaseUrl() {
  const apiUrl = cleanEnvValue(process.env.EXPO_PUBLIC_API_URL);
  return API_URL_PLACEHOLDERS.has(apiUrl) ? '' : apiUrl;
}

export function getApiConfigError() {
  const rawApiUrl = cleanEnvValue(process.env.EXPO_PUBLIC_API_URL);
  const apiUrl = getApiBaseUrl();

  if (!rawApiUrl) {
    return "L'adresse API mobile est manquante.";
  }

  if (!apiUrl) {
    return "L'adresse API mobile n'est pas encore configuree.";
  }

  try {
    const parsed = new URL(apiUrl);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return 'Configuration serveur invalide';
    }
  } catch {
    return 'Configuration serveur invalide';
  }

  return null;
}

export function getSupabaseConfig() {
  return {
    url: cleanEnvValue(process.env.EXPO_PUBLIC_SUPABASE_URL),
    anonKey: cleanEnvValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
    bucket: cleanEnvValue(process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET) || 'easysyndic-media',
  };
}

export function isSupabaseStorageConfigured() {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey);
}
