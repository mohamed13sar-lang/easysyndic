import * as SecureStore from 'expo-secure-store';

const SELECTED_RELATION_KEY = 'easysyndic.selectedResidentRelation';

async function isSecureStoreAvailable() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function saveSelectedResidenceRelationId(relationId: string) {
  if (!(await isSecureStoreAvailable())) {
    return;
  }

  try {
    await SecureStore.setItemAsync(SELECTED_RELATION_KEY, relationId);
  } catch (error) {
    console.warn('[selected-residence-storage] failed to save selected resident residence', error);
  }
}

export async function loadSelectedResidenceRelationId() {
  if (!(await isSecureStoreAvailable())) {
    return null;
  }

  try {
    return await SecureStore.getItemAsync(SELECTED_RELATION_KEY);
  } catch (error) {
    console.warn('[selected-residence-storage] failed to load selected resident residence', error);
    return null;
  }
}

export async function clearSelectedResidenceRelationId() {
  if (!(await isSecureStoreAvailable())) {
    return;
  }

  try {
    await SecureStore.deleteItemAsync(SELECTED_RELATION_KEY);
  } catch (error) {
    console.warn('[selected-residence-storage] failed to clear selected resident residence', error);
  }
}
