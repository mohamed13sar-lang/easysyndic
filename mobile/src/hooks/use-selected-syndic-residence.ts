import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/client';
import {
  getSyndicResidences,
  SyndicResidence,
} from '@/services/syndic-residences-service';
import {
  loadSelectedSyndicResidenceId,
  saveSelectedSyndicResidenceId,
} from '@/services/selected-syndic-residence-storage';

export function formatSyndicResidenceAddress(residence: SyndicResidence) {
  return [residence.address, residence.district, residence.city].filter(Boolean).join(', ');
}

export function useSelectedSyndicResidence() {
  const { token } = useAuth();
  const [residences, setResidences] = useState<SyndicResidence[]>([]);
  const [selectedResidenceId, setSelectedResidenceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const [data, storedResidenceId] = await Promise.all([
        getSyndicResidences(token),
        loadSelectedSyndicResidenceId(),
      ]);
      const selected =
        data.find((residence) => residence.id === storedResidenceId) ??
        data.find((residence) => residence.isActive) ??
        data[0] ??
        null;

      console.log('[syndic-residence] selectedResidenceId', selected?.id ?? null);
      setResidences(data);
      setSelectedResidenceId(selected?.id ?? null);

      if (selected) {
        await saveSelectedSyndicResidenceId(selected.id);
      }
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Impossible de charger vos residences.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedResidence = useMemo(
    () => residences.find((residence) => residence.id === selectedResidenceId) ?? null,
    [residences, selectedResidenceId],
  );

  return {
    residences,
    selectedResidence,
    selectedResidenceId,
    isLoading,
    error,
    reload: load,
  };
}
