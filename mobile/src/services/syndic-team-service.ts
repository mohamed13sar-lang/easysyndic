import { apiRequest } from '@/lib/api/client';

export type TeamRole = 'VICE_SYNDIC' | 'CAISSIER' | 'CASHIER' | 'GARDIEN' | 'SECRETAIRE';

export type PermissionMap = Record<string, Record<string, boolean>>;

export type SyndicTeamMember = {
  id: string;
  userId: string;
  residenceId: string;
  role: TeamRole;
  permissions: PermissionMap;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  temporaryPassword?: string;
  user: {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    isActive: boolean;
  };
};

export type CreateTeamMemberPayload = {
  residenceId: string;
  fullName: string;
  phone: string;
  email?: string;
  role: TeamRole;
  permissions: PermissionMap;
};

export type UpdateTeamMemberPayload = {
  role?: TeamRole;
  permissions?: PermissionMap;
};

export function getPermissionTemplates(token: string) {
  return apiRequest<Record<TeamRole, PermissionMap>>('/syndic/permissions-template', {
    token,
  });
}

export function getSyndicTeam(token: string, residenceId: string) {
  return apiRequest<SyndicTeamMember[]>(`/syndic/team?residenceId=${residenceId}`, {
    token,
  });
}

export function getMySyndicPermissions(token: string, residenceId: string) {
  return apiRequest<PermissionMap>(`/syndic/me/permissions?residenceId=${residenceId}`, {
    token,
  });
}

export function createSyndicTeamMember(token: string, payload: CreateTeamMemberPayload) {
  return apiRequest<SyndicTeamMember>('/syndic/team', {
    method: 'POST',
    body: payload,
    token,
  });
}

export function updateSyndicTeamMember(
  token: string,
  id: string,
  payload: UpdateTeamMemberPayload,
) {
  return apiRequest<SyndicTeamMember>(`/syndic/team/${id}`, {
    method: 'PATCH',
    body: payload,
    token,
  });
}

export function updateSyndicTeamMemberStatus(
  token: string,
  id: string,
  isActive: boolean,
) {
  return apiRequest<SyndicTeamMember>(`/syndic/team/${id}/status`, {
    method: 'PATCH',
    body: { isActive },
    token,
  });
}

export function deleteSyndicTeamMember(token: string, id: string) {
  return apiRequest<SyndicTeamMember>(`/syndic/team/${id}`, {
    method: 'DELETE',
    token,
  });
}
