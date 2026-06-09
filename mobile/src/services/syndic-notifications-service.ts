import { apiRequest } from '@/lib/api/client';

export type SyndicNotificationType =
  | 'GENERAL'
  | 'TARGETED'
  | 'NEW_ANNOUNCEMENT'
  | 'PAYMENT_REMINDER'
  | 'PAYMENT_RECEIVED'
  | 'COMPLAINT_STATUS'
  | 'DOCUMENT_SHARED'
  | 'SYSTEM';

export type SyndicNotificationTargetType =
  | 'RESIDENCE'
  | 'APARTMENT'
  | 'USER'
  | 'NON_PAID'
  | 'ROLE';

export type SyndicNotification = {
  id: string;
  residenceId: string | null;
  senderId: string;
  title: string;
  message: string;
  type: SyndicNotificationType;
  targetType: SyndicNotificationTargetType;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  recipientsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateSyndicNotificationInput = {
  title: string;
  message: string;
  type?: SyndicNotificationType;
  targetType: SyndicNotificationTargetType;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

export function getSyndicNotifications(token: string, residenceId: string) {
  return apiRequest<SyndicNotification[]>(`/residences/${residenceId}/notifications`, {
    token,
  });
}

export function createSyndicNotification(
  token: string,
  residenceId: string,
  input: CreateSyndicNotificationInput,
) {
  return apiRequest<SyndicNotification>(`/residences/${residenceId}/notifications`, {
    method: 'POST',
    token,
    body: input,
  });
}
