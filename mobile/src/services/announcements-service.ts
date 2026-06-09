import { apiRequest } from '@/lib/api/client';

export type AnnouncementType =
  | 'ASSEMBLEE_GENERALE'
  | 'DECES'
  | 'COUPURE_ELECTRICITE'
  | 'COUPURE_EAU'
  | 'TRAVAUX'
  | 'NETTOYAGE'
  | 'SECURITE'
  | 'AUTRE';

export type AnnouncementPriority = 'NORMAL' | 'IMPORTANT' | 'URGENT';

export type Announcement = {
  id: string;
  residenceId: string;
  createdById: string;
  title: string;
  message: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  publishAt: string;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  residence?: { id: string; name: string };
  createdBy?: { id: string; fullName: string };
};

export function getMyAnnouncements(
  token: string,
  filters: { residenceId: string; limit?: number },
) {
  const params = new URLSearchParams({ residenceId: filters.residenceId });
  if (filters.limit) {
    params.set('limit', String(filters.limit));
  }

  const path = `/me/announcements?${params.toString()}`;
  if (__DEV__) {
    console.log('[announcements-api] final URL', path);
  }

  return apiRequest<Announcement[]>(path, {
    token,
  });
}

export function getMyAnnouncement(token: string, announcementId: string) {
  return apiRequest<Announcement>(`/me/announcements/${announcementId}`, {
    token,
  });
}
