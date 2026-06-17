import { apiRequest } from '@/lib/api/client';
import { appendUploadFile, type UploadFile } from './upload-service';

export type DocumentType =
  | 'ASSEMBLEE_GENERALE'
  | 'PV'
  | 'FACTURE'
  | 'TRAVAUX'
  | 'CONTRAT'
  | 'GENERAL';

export type AppDocument = {
  id: string;
  title: string;
  description: string | null;
  type: DocumentType;
  fileName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  residenceId: string;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateDocumentInput = {
  title: string;
  description?: string;
  type: DocumentType;
  residenceId: string;
};

export function getMyDocuments(token: string, residenceId?: string) {
  const query = residenceId ? `?residenceId=${encodeURIComponent(residenceId)}` : '';
  return apiRequest<AppDocument[]>(`/me/documents${query}`, { token });
}

export function getSyndicDocuments(token: string, residenceId: string) {
  return apiRequest<AppDocument[]>(`/syndic/residences/${residenceId}/documents`, {
    token,
  });
}

export function createSyndicDocument(
  token: string,
  input: CreateDocumentInput,
  file: UploadFile,
) {
  const formData = new FormData();
  formData.append('title', input.title);
  if (input.description) {
    formData.append('description', input.description);
  }
  formData.append('type', input.type);
  formData.append('residenceId', input.residenceId);
  appendUploadFile(formData, 'file', file);

  return apiRequest<AppDocument>('/syndic/documents', {
    method: 'POST',
    token,
    body: formData,
  });
}

export function getDocumentSignedUrl(token: string, documentId: string) {
  return apiRequest<{ url: string }>(`/documents/${documentId}/signed-url`, {
    token,
  });
}
