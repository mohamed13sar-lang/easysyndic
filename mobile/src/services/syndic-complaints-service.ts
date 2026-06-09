import { apiRequest } from '@/lib/api/client';
import {
  ComplaintCategory,
  ComplaintMedia,
  ComplaintStatus,
  ComplaintUrgency,
  CreateComplaintMediaInput,
} from '@/services/complaints-service';

export type SyndicComplaintStatus =
  | 'NOUVELLE'
  | 'VUE'
  | 'EN_COURS'
  | 'RESOLUE'
  | 'FERMEE'
  | 'REFUSEE';

export type SyndicComplaint = {
  id: string;
  residenceId: string;
  apartmentId: string;
  residentId: string | null;
  resident?: {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    role: string;
    isActive: boolean;
  } | null;
  apartment: {
    id: string;
    number: string;
    block: string | null;
    floor: number | null;
  };
  category: ComplaintCategory;
  title: string;
  description: string;
  urgency: ComplaintUrgency;
  status: ComplaintStatus;
  assignedToId: string | null;
  sentToLhrayfi: boolean;
  isAnonymous: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  media: ComplaintMedia[];
  commentsCount: number;
};

export type SyndicComplaintComment = {
  id: string;
  complaintId: string;
  userId: string;
  comment: string;
  isInternal: boolean;
  createdAt: string;
};

export function getSyndicComplaints(token: string, residenceId: string) {
  const path = `/syndic/residences/${residenceId}/complaints`;
  console.log('[syndic-complaints] request URL', path);
  return apiRequest<SyndicComplaint[]>(
    path,
    { token },
  );
}

export function getSyndicComplaint(
  token: string,
  residenceId: string,
  complaintId: string,
) {
  const path = `/syndic/residences/${residenceId}/complaints/${complaintId}`;
  console.log('[syndic-complaints] request URL', path);
  return apiRequest<SyndicComplaint>(
    path,
    { token },
  );
}

export function updateSyndicComplaintStatus(
  token: string,
  residenceId: string,
  complaintId: string,
  status: SyndicComplaintStatus,
) {
  const path = `/syndic/residences/${residenceId}/complaints/${complaintId}/status`;
  console.log('[syndic-complaints] request URL', path);
  return apiRequest<SyndicComplaint>(
    path,
    {
      method: 'PATCH',
      token,
      body: { status },
    },
  );
}

export function addSyndicComplaintComment(
  token: string,
  residenceId: string,
  complaintId: string,
  comment: string,
) {
  const path = `/syndic/residences/${residenceId}/complaints/${complaintId}/comments`;
  console.log('[syndic-complaints] request URL', path);
  return apiRequest<SyndicComplaintComment>(
    path,
    {
      method: 'POST',
      token,
      body: { comment, isInternal: false },
    },
  );
}

export function getSyndicComplaintMedia(
  token: string,
  residenceId: string,
  complaintId: string,
) {
  const path = `/syndic/residences/${residenceId}/complaints/${complaintId}/media`;
  return apiRequest<ComplaintMedia[]>(path, { token });
}

export function addSyndicComplaintMedia(
  token: string,
  residenceId: string,
  complaintId: string,
  input: CreateComplaintMediaInput,
) {
  const path = `/syndic/residences/${residenceId}/complaints/${complaintId}/media`;
  return apiRequest<ComplaintMedia>(path, {
    method: 'POST',
    token,
    body: input,
  });
}
