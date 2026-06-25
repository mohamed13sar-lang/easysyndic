import {
  AssemblyAgendaItem,
  AssemblyGeneral,
  AssemblyParticipant,
  AssemblyResult,
  AssemblyStatus,
  AssemblyType,
  ParticipantStatus,
  ResolutionVotingStatus,
} from './assemblies-service';
import { apiRequest } from '@/lib/api/client';

export type AssemblyPayload = {
  title: string;
  description?: string;
  type?: AssemblyType;
  scheduledAt: string;
  location: string;
  meetingLink?: string;
  quorumRequired?: number;
};

export type AgendaPayload = {
  title: string;
  description?: string;
  order?: number;
};

export type ResolutionPayload = AgendaPayload;

function base(residenceId: string) {
  return `/syndic/residences/${residenceId}/assemblies`;
}

export function getSyndicAssemblies(token: string, residenceId: string) {
  return apiRequest<AssemblyGeneral[]>(base(residenceId), { token });
}

export function createAssembly(token: string, residenceId: string, payload: AssemblyPayload) {
  return apiRequest<AssemblyGeneral>(base(residenceId), {
    method: 'POST',
    token,
    body: payload,
  });
}

export function getSyndicAssembly(token: string, residenceId: string, assemblyId: string) {
  return apiRequest<AssemblyGeneral>(`${base(residenceId)}/${assemblyId}`, { token });
}

export function updateAssembly(
  token: string,
  residenceId: string,
  assemblyId: string,
  payload: Partial<AssemblyPayload>,
) {
  return apiRequest<AssemblyGeneral>(`${base(residenceId)}/${assemblyId}`, {
    method: 'PATCH',
    token,
    body: payload,
  });
}

export function updateAssemblyStatus(
  token: string,
  residenceId: string,
  assemblyId: string,
  status: AssemblyStatus,
) {
  return apiRequest<AssemblyGeneral>(`${base(residenceId)}/${assemblyId}/status`, {
    method: 'PATCH',
    token,
    body: { status },
  });
}

export function addAgendaItem(
  token: string,
  residenceId: string,
  assemblyId: string,
  payload: AgendaPayload,
) {
  return apiRequest<AssemblyAgendaItem>(`${base(residenceId)}/${assemblyId}/agenda`, {
    method: 'POST',
    token,
    body: payload,
  });
}

export function updateAgendaItem(
  token: string,
  residenceId: string,
  assemblyId: string,
  itemId: string,
  payload: AgendaPayload,
) {
  return apiRequest<AssemblyAgendaItem>(`${base(residenceId)}/${assemblyId}/agenda/${itemId}`, {
    method: 'PATCH',
    token,
    body: payload,
  });
}

export function deleteAgendaItem(token: string, residenceId: string, assemblyId: string, itemId: string) {
  return apiRequest(`${base(residenceId)}/${assemblyId}/agenda/${itemId}`, {
    method: 'DELETE',
    token,
  });
}

export function createResolution(
  token: string,
  residenceId: string,
  assemblyId: string,
  payload: ResolutionPayload,
) {
  return apiRequest(`${base(residenceId)}/${assemblyId}/resolutions`, {
    method: 'POST',
    token,
    body: payload,
  });
}

export function updateResolution(
  token: string,
  residenceId: string,
  assemblyId: string,
  resolutionId: string,
  payload: ResolutionPayload,
) {
  return apiRequest(`${base(residenceId)}/${assemblyId}/resolutions/${resolutionId}`, {
    method: 'PATCH',
    token,
    body: payload,
  });
}

export function updateVotingStatus(
  token: string,
  residenceId: string,
  assemblyId: string,
  resolutionId: string,
  votingStatus: ResolutionVotingStatus,
) {
  return apiRequest(`${base(residenceId)}/${assemblyId}/resolutions/${resolutionId}/voting-status`, {
    method: 'PATCH',
    token,
    body: { votingStatus },
  });
}

export function getParticipants(token: string, residenceId: string, assemblyId: string) {
  return apiRequest<AssemblyParticipant[]>(`${base(residenceId)}/${assemblyId}/participants`, {
    token,
  });
}

export function updateParticipant(
  token: string,
  residenceId: string,
  assemblyId: string,
  participantId: string,
  input: { status: ParticipantStatus; representedByName?: string },
) {
  return apiRequest<AssemblyParticipant>(
    `${base(residenceId)}/${assemblyId}/participants/${participantId}`,
    { method: 'PATCH', token, body: input },
  );
}

export function getResults(token: string, residenceId: string, assemblyId: string) {
  return apiRequest<AssemblyResult[]>(`${base(residenceId)}/${assemblyId}/results`, { token });
}
