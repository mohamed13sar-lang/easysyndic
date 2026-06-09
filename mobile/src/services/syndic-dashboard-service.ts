import { apiRequest } from '@/lib/api/client';

export type SyndicDashboardStats = {
  totalResidences: number;
  totalApartments: number;
  totalResidents: number;
  unpaidPaymentsCount: number;
  unpaidPaymentsAmount: number;
  openComplaintsCount: number;
  resolvedComplaintsCount: number;
  notificationsSentCount: number;
};

export function getSyndicDashboardStats(token: string) {
  return apiRequest<SyndicDashboardStats>('/syndic/dashboard/stats', {
    token,
  });
}
