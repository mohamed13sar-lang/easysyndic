import {
  deleteSecureStoreItem,
  getSecureStoreItem,
  isSecureStoreAvailable,
  setSecureStoreItem,
} from '@/services/safe-secure-store';

const SELECTED_RELATION_KEY = 'easysyndic.selectedResidentRelation';

export async function saveSelectedResidenceRelationId(relationId: string) {
  if (!(await isSecureStoreAvailable())) {
    return;
  }

  try {
    await setSecureStoreItem(SELECTED_RELATION_KEY, relationId);
  } catch (error) {
    console.warn('[selected-residence-storage] failed to save selected resident residence', error);
  }
}

export async function loadSelectedResidenceRelationId() {
  if (!(await isSecureStoreAvailable())) {
    return null;
  }

  try {
    return await getSecureStoreItem(SELECTED_RELATION_KEY);
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
    await deleteSecureStoreItem(SELECTED_RELATION_KEY);
  } catch (error) {
    console.warn('[selected-residence-storage] failed to clear selected resident residence', error);
  }
}
