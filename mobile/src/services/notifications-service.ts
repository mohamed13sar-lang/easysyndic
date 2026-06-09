import { apiRequest } from '@/lib/api/client';

export type NotificationType =
  | 'GENERAL'
  | 'TARGETED'
  | 'NEW_ANNOUNCEMENT'
  | 'PAYMENT_REMINDER'
  | 'PAYMENT_RECEIVED'
  | 'COMPLAINT_STATUS'
  | 'DOCUMENT_SHARED'
  | 'SYSTEM';

export type NotificationTargetType =
  | 'RESIDENCE'
  | 'APARTMENT'
  | 'USER'
  | 'NON_PAID'
  | 'ROLE';

export type ResidentNotification = {
  id: string;
  recipientId: string;
  notificationId: string;
  title: string;
  message: string;
  type: NotificationType;
  targetType: NotificationTargetType;
  metadata: Record<string, unknown> | null;
  senderName: string | null;
  isRead: boolean;
  readAt: string | null;
  pushStatus: 'PENDING' | 'SENT' | 'FAILED' | 'READ';
  createdAt: string;
};

export function getMyNotifications(token: string, filters?: { residenceId?: string }) {
  const params = new URLSearchParams();
  if (filters?.residenceId) {
    params.set('residenceId', filters.residenceId);
  }

  const query = params.toString();
  return apiRequest<ResidentNotification[]>(`/me/notifications${query ? `?${query}` : ''}`, {
    token,
  });
}

export function getMyNotification(token: string, recipientId: string) {
  return apiRequest<ResidentNotification>(`/me/notifications/${recipientId}`, {
    token,
  });
}

export function markNotificationRead(token: string, recipientId: string) {
  return apiRequest(`/me/notifications/${recipientId}/read`, {
    method: 'PATCH',
    token,
  });
}

export function markAllNotificationsRead(token: string, filters?: { residenceId?: string }) {
  const params = new URLSearchParams();
  if (filters?.residenceId) {
    params.set('residenceId', filters.residenceId);
  }

  const query = params.toString();
  return apiRequest<{ updatedCount: number }>(
    `/me/notifications/read-all${query ? `?${query}` : ''}`,
    {
      method: 'PATCH',
      token,
    },
  );
}

export function registerPushToken(
  token: string,
  input: { expoPushToken: string; platform: 'ios' | 'android' | 'web' },
) {
  return apiRequest('/me/push-token', {
    method: 'POST',
    token,
    body: input,
  });
}
