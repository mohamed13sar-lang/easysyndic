import { apiRequest } from '@/lib/api/client';
import { appendUploadFile, type UploadFile } from './upload-service';

export type ComplaintCategory =
  | 'ASCENSEUR'
  | 'EAU'
  | 'ELECTRICITE'
  | 'NETTOYAGE'
  | 'SECURITE'
  | 'PARKING'
  | 'BRUIT'
  | 'ECLAIRAGE'
  | 'PORTE_GARAGE'
  | 'CAMERA'
  | 'VOISINAGE'
  | 'AUTRE';

export type ComplaintUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ComplaintStatus =
  | 'NOUVELLE'
  | 'VUE'
  | 'EN_COURS'
  | 'ENVOYEE_LHRAYFI'
  | 'PRESTATAIRE_AFFECTE'
  | 'RESOLUE'
  | 'FERMEE'
  | 'REFUSEE';

export type ComplaintMediaType = 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';

export type ComplaintMedia = {
  id: string;
  complaintId: string;
  fileUrl: string;
  fileType: ComplaintMediaType;
  url: string;
  type: ComplaintMediaType;
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
  uploadedById: string | null;
  createdAt: string;
};

export type ResidentComplaint = {
  id: string;
  residenceId: string;
  apartmentId: string;
  residentId: string | null;
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

export type CreateComplaintInput = {
  residenceId: string;
  apartmentId: string;
  category: ComplaintCategory;
  title: string;
  description: string;
  urgency: ComplaintUrgency;
  media?: CreateComplaintMediaInput[];
};

export type CreateComplaintMediaInput = {
  url?: string;
  fileUrl?: string;
  type?: ComplaintMediaType;
  fileType?: ComplaintMediaType;
  fileName?: string;
  mimeType?: string;
  size?: number;
};

export function getMyComplaints(
  token: string,
  filters?: { residenceId?: string; apartmentId?: string },
) {
  const params = new URLSearchParams();
  if (filters?.residenceId) {
    params.set('residenceId', filters.residenceId);
  }
  if (filters?.apartmentId) {
    params.set('apartmentId', filters.apartmentId);
  }

  const query = params.toString();
  return apiRequest<ResidentComplaint[]>(`/me/complaints${query ? `?${query}` : ''}`, {
    token,
  });
}

export function createMyComplaint(token: string, input: CreateComplaintInput) {
  return apiRequest<ResidentComplaint>('/me/complaints', {
    method: 'POST',
    token,
    body: input,
  });
}

export function createMyComplaintWithMedia(
  token: string,
  input: CreateComplaintInput,
  files: UploadFile[],
) {
  if (!files.length) {
    return createMyComplaint(token, input);
  }

  const formData = new FormData();
  formData.append('residenceId', input.residenceId);
  formData.append('apartmentId', input.apartmentId);
  formData.append('category', input.category);
  formData.append('title', input.title);
  formData.append('description', input.description);
  formData.append('urgency', input.urgency);
  files.forEach((file) => appendUploadFile(formData, 'files', file));

  return apiRequest<ResidentComplaint>('/me/complaints', {
    method: 'POST',
    token,
    body: formData,
  });
}

export function getMyComplaint(token: string, id: string) {
  return apiRequest<ResidentComplaint>(`/me/complaints/${id}`, {
    token,
  });
}

export function getMyComplaintMedia(token: string, complaintId: string) {
  return apiRequest<ComplaintMedia[]>(`/me/complaints/${complaintId}/media`, {
    token,
  });
}

export function addMyComplaintMedia(
  token: string,
  complaintId: string,
  input: CreateComplaintMediaInput,
) {
  return apiRequest<ComplaintMedia>(`/me/complaints/${complaintId}/media`, {
    method: 'POST',
    token,
    body: input,
  });
}
