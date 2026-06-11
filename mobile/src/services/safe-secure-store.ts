type SecureStoreModule = typeof import('expo-secure-store');

let secureStorePromise: Promise<SecureStoreModule | null> | null = null;

async function loadSecureStore() {
  if (!secureStorePromise) {
    secureStorePromise = import('expo-secure-store').catch((error) => {
      console.warn('[secure-store] native module unavailable', error);
      return null;
    });
  }

  return secureStorePromise;
}

export async function isSecureStoreAvailable() {
  try {
    const secureStore = await loadSecureStore();
    return Boolean(secureStore && (await secureStore.isAvailableAsync()));
  } catch (error) {
    console.warn('[secure-store] availability check failed', error);
    return false;
  }
}

export async function setSecureStoreItem(key: string, value: string) {
  try {
    const secureStore = await loadSecureStore();
    if (!secureStore || !(await secureStore.isAvailableAsync())) return false;
    await secureStore.setItemAsync(key, value);
    return true;
  } catch (error) {
    console.warn(`[secure-store] failed to save ${key}`, error);
    return false;
  }
}

export async function getSecureStoreItem(key: string) {
  try {
    const secureStore = await loadSecureStore();
    if (!secureStore || !(await secureStore.isAvailableAsync())) return null;
    return await secureStore.getItemAsync(key);
  } catch (error) {
    console.warn(`[secure-store] failed to load ${key}`, error);
    return null;
  }
}

export async function deleteSecureStoreItem(key: string) {
  try {
    const secureStore = await loadSecureStore();
    if (!secureStore || !(await secureStore.isAvailableAsync())) return false;
    await secureStore.deleteItemAsync(key);
    return true;
  } catch (error) {
    console.warn(`[secure-store] failed to delete ${key}`, error);
    return false;
  }
}
