import { apiRequest } from '@/lib/api/client';

export type ResidentType = 'OWNER' | 'TENANT';

export type SyndicResidentApartment = {
  id: string;
  userId: string;
  apartmentId: string;
  residenceId: string;
  residentType: ResidentType;
  isPrimary: boolean;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SyndicResident = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  role: 'RESIDENT';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  residentApartments: SyndicResidentApartment[];
};

export type CreateSyndicResidentInput = {
  fullName: string;
  phone: string;
  email?: string;
  apartmentId: string;
  residentType: ResidentType;
  isPrimary?: boolean;
};

export type AssignSyndicResidentApartmentInput = {
  apartmentId: string;
  residentType: ResidentType;
  isPrimary?: boolean;
};

export function getSyndicResidents(token: string, residenceId: string) {
  return apiRequest<SyndicResident[]>(`/syndic/residences/${residenceId}/residents`, {
    token,
  });
}

export function createSyndicResident(
  token: string,
  residenceId: string,
  input: CreateSyndicResidentInput,
) {
  return apiRequest<SyndicResident>(`/syndic/residences/${residenceId}/residents`, {
    method: 'POST',
    token,
    body: input,
  });
}

export function assignSyndicResidentApartment(
  token: string,
  residenceId: string,
  residentId: string,
  input: AssignSyndicResidentApartmentInput,
) {
  return apiRequest<SyndicResidentApartment>(
    `/syndic/residences/${residenceId}/residents/${residentId}/assign-apartment`,
    {
      method: 'POST',
      token,
      body: input,
    },
  );
}
