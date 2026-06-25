import { apiRequest } from '@/lib/api/client';

export type AssemblyType = 'ORDINAIRE' | 'EXTRAORDINAIRE';
export type AssemblyStatus = 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'CLOSED' | 'CANCELLED';
export type ParticipantStatus = 'INVITED' | 'PRESENT' | 'ABSENT' | 'REPRESENTED';
export type ResolutionVotingStatus = 'NOT_STARTED' | 'OPEN' | 'CLOSED';
export type AssemblyVoteValue = 'YES' | 'NO' | 'ABSTAIN';

export type AssemblyAgendaItem = {
  id: string;
  assemblyId: string;
  title: string;
  description: string | null;
  order: number;
};

export type AssemblyResolution = {
  id: string;
  assemblyId: string;
  title: string;
  description: string | null;
  order: number;
  votingStatus: ResolutionVotingStatus;
  votes?: Array<{ id: string; userId: string; vote: AssemblyVoteValue }>;
};

export type AssemblyParticipant = {
  id: string;
  assemblyId: string;
  userId: string;
  apartmentId: string | null;
  status: ParticipantStatus;
  representedByName: string | null;
  checkedInAt: string | null;
  user?: { id: string; fullName: string; phone?: string | null; email?: string | null };
  apartment?: { id: string; number: string; block: string | null; floor: number | null };
};

export type AssemblyGeneral = {
  id: string;
  residenceId: string;
  createdById: string;
  title: string;
  description: string | null;
  type: AssemblyType;
  status: AssemblyStatus;
  scheduledAt: string;
  location: string;
  meetingLink: string | null;
  quorumRequired: number | null;
  createdAt: string;
  updatedAt: string;
  agendaItems?: AssemblyAgendaItem[];
  participants?: AssemblyParticipant[];
  resolutions?: AssemblyResolution[];
  _count?: { agendaItems: number; participants: number; resolutions: number };
};

export type AssemblyResult = {
  resolutionId: string;
  title: string;
  votingStatus: ResolutionVotingStatus;
  totalVotes: number;
  results: Record<AssemblyVoteValue, number>;
};

export function getMyAssemblies(token: string, residenceId: string) {
  return apiRequest<AssemblyGeneral[]>(
    `/me/assemblies?residenceId=${encodeURIComponent(residenceId)}`,
    { token },
  );
}

export function getMyAssembly(token: string, id: string) {
  return apiRequest<AssemblyGeneral>(`/me/assemblies/${id}`, { token });
}

export function updateMyAttendance(token: string, id: string, input: {
  status: ParticipantStatus;
  representedByName?: string;
}) {
  return apiRequest<AssemblyParticipant>(`/me/assemblies/${id}/attendance`, {
    method: 'PATCH',
    token,
    body: input,
  });
}

export function voteResolution(
  token: string,
  assemblyId: string,
  resolutionId: string,
  vote: AssemblyVoteValue,
) {
  return apiRequest(`/me/assemblies/${assemblyId}/resolutions/${resolutionId}/vote`, {
    method: 'POST',
    token,
    body: { vote },
  });
}

export function getMyAssemblyResults(token: string, id: string) {
  return apiRequest<AssemblyResult[]>(`/me/assemblies/${id}/results`, { token });
}
