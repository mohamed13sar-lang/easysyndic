import * as SecureStore from 'expo-secure-store';

const SELECTED_SYNDIC_RESIDENCE_KEY = 'easysyndic.selectedSyndicResidence';

async function isSecureStoreAvailable() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function saveSelectedSyndicResidenceId(residenceId: string) {
  if (!(await isSecureStoreAvailable())) return;
  try {
    await SecureStore.setItemAsync(SELECTED_SYNDIC_RESIDENCE_KEY, residenceId);
  } catch (error) {
    console.warn('[selected-syndic-residence-storage] failed to save selected syndic residence', error);
  }
}

export async function loadSelectedSyndicResidenceId() {
  if (!(await isSecureStoreAvailable())) return null;
  try {
    return await SecureStore.getItemAsync(SELECTED_SYNDIC_RESIDENCE_KEY);
  } catch (error) {
    console.warn('[selected-syndic-residence-storage] failed to load selected syndic residence', error);
    return null;
  }
}

export async function clearSelectedSyndicResidenceId() {
  if (!(await isSecureStoreAvailable())) return;
  try {
    await SecureStore.deleteItemAsync(SELECTED_SYNDIC_RESIDENCE_KEY);
  } catch (error) {
    console.warn('[selected-syndic-residence-storage] failed to clear selected syndic residence', error);
  }
}
