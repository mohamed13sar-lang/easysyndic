import { apiRequest } from '@/lib/api/client';

export type SyndicResidence = {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string | null;
  totalApartments: number | null;
  isActive: boolean;
  apartmentsCount: number;
  residentsCount: number;
  openComplaintsCount: number;
  unpaidPaymentsAmount: number;
};

export function getSyndicResidences(token: string) {
  return apiRequest<SyndicResidence[]>('/syndic/residences', {
    token,
  });
}
