import * as SecureStore from 'expo-secure-store';

let availabilityPromise: Promise<boolean> | null = null;

async function isAvailable() {
  if (!availabilityPromise) {
    availabilityPromise = SecureStore.isAvailableAsync().catch((error) => {
      console.warn('[secure-store] availability check failed', error);
      return false;
    });
  }

  return availabilityPromise;
}

export async function isSecureStoreAvailable() {
  return isAvailable();
}

export async function setSecureStoreItem(key: string, value: string) {
  try {
    if (!(await isAvailable())) return false;
    await SecureStore.setItemAsync(key, value);
    return true;
  } catch (error) {
    console.warn(`[secure-store] failed to save ${key}`, error);
    return false;
  }
}

export async function getSecureStoreItem(key: string) {
  try {
    if (!(await isAvailable())) return null;
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.warn(`[secure-store] failed to load ${key}`, error);
    return null;
  }
}

export async function deleteSecureStoreItem(key: string) {
  try {
    if (!(await isAvailable())) return false;
    await SecureStore.deleteItemAsync(key);
    return true;
  } catch (error) {
    console.warn(`[secure-store] failed to delete ${key}`, error);
    return false;
  }
}
