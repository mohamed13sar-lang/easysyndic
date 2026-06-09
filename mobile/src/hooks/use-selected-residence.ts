import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/client';
import { getMyResidences, ResidentResidence } from '@/services/resident-service';
import {
  loadSelectedResidenceRelationId,
  saveSelectedResidenceRelationId,
} from '@/services/selected-residence-storage';

export function formatResidenceAddress(residence: ResidentResidence) {
  return [residence.address, residence.district, residence.city].filter(Boolean).join(', ');
}

export function formatApartmentLabel(residence: ResidentResidence) {
  return `Appartement ${residence.apartment.number}`;
}

export function formatFloorLabel(residence: ResidentResidence) {
  if (residence.apartment.floor === null) {
    return residence.apartment.block ? `Bloc ${residence.apartment.block}` : 'Étage non renseigné';
  }

  const floor = `${residence.apartment.floor}e étage`;
  return residence.apartment.block ? `${floor} - Bloc ${residence.apartment.block}` : floor;
}

export function useSelectedResidence() {
  const { token } = useAuth();
  const [residences, setResidences] = useState<ResidentResidence[]>([]);
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);
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
      const [response, storedRelationId] = await Promise.all([
        getMyResidences(token),
        loadSelectedResidenceRelationId(),
      ]);
      const selected =
        response.residences.find((residence) => residence.relationId === storedRelationId) ??
        response.activeRelation ??
        response.residences[0] ??
        null;

      setResidences(response.residences);
      setSelectedRelationId(selected?.relationId ?? null);

      if (selected) {
        await saveSelectedResidenceRelationId(selected.relationId);
      }
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Impossible de charger votre residence.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedResidence = useMemo(
    () => residences.find((residence) => residence.relationId === selectedRelationId) ?? null,
    [residences, selectedRelationId],
  );

  return {
    residences,
    selectedResidence,
    selectedRelationId,
    isLoading,
    error,
    reload: load,
  };
}
