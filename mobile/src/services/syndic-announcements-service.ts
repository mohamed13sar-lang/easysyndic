import {
  Announcement,
  AnnouncementPriority,
  AnnouncementType,
} from '@/services/announcements-service';
import { apiRequest } from '@/lib/api/client';

export type CreateSyndicAnnouncementInput = {
  title: string;
  message: string;
  type: AnnouncementType;
  priority?: AnnouncementPriority;
  publishAt?: string;
  expiresAt?: string;
};

export type UpdateSyndicAnnouncementInput = Partial<CreateSyndicAnnouncementInput>;

export function getSyndicAnnouncements(token: string, residenceId: string) {
  return apiRequest<Announcement[]>(
    `/syndic/residences/${residenceId}/announcements`,
    { token },
  );
}

export function createSyndicAnnouncement(
  token: string,
  residenceId: string,
  input: CreateSyndicAnnouncementInput,
) {
  return apiRequest<Announcement>(
    `/syndic/residences/${residenceId}/announcements`,
    {
      method: 'POST',
      token,
      body: input,
    },
  );
}

export function updateSyndicAnnouncement(
  token: string,
  residenceId: string,
  announcementId: string,
  input: UpdateSyndicAnnouncementInput,
) {
  return apiRequest<Announcement>(
    `/syndic/residences/${residenceId}/announcements/${announcementId}`,
    {
      method: 'PATCH',
      token,
      body: input,
    },
  );
}

export function updateSyndicAnnouncementStatus(
  token: string,
  residenceId: string,
  announcementId: string,
  isActive: boolean,
) {
  return apiRequest<Announcement>(
    `/syndic/residences/${residenceId}/announcements/${announcementId}/status`,
    {
      method: 'PATCH',
      token,
      body: { isActive },
    },
  );
}

export function deleteSyndicAnnouncement(
  token: string,
  residenceId: string,
  announcementId: string,
) {
  return apiRequest<Announcement>(
    `/syndic/residences/${residenceId}/announcements/${announcementId}`,
    {
      method: 'DELETE',
      token,
    },
  );
}
