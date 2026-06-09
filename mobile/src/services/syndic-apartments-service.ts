import { apiRequest } from '@/lib/api/client';
import { PaymentMethod, PaymentStatus } from './syndic-payments-service';

export type SyndicApartment = {
  id: string;
  residenceId: string;
  number: string;
  floor: number | null;
  block: string | null;
  surface: number | null;
  monthlyFee: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    residentApartments: number;
    payments: number;
  };
};

export type CreateSyndicApartmentInput = {
  number: string;
  floor?: number;
  block?: string;
  monthlyFee?: number;
};

export type UpdateSyndicApartmentInput = Partial<CreateSyndicApartmentInput>;

export type ApartmentProfileComplaintStatus =
  | 'NOUVELLE'
  | 'VUE'
  | 'EN_COURS'
  | 'ENVOYEE_LHRAYFI'
  | 'PRESTATAIRE_AFFECTE'
  | 'RESOLUE'
  | 'FERMEE'
  | 'REFUSEE';

export type ApartmentProfilePayment = {
  id: string;
  residenceId: string;
  apartmentId: string;
  residentId: string;
  amountDue: number;
  amountPaid: number;
  remainingAmount: number;
  month: number;
  year: number;
  status: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  receiptUrl: string | null;
  note: string | null;
  paidAt: string | null;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

export type ApartmentProfile = {
  apartment: SyndicApartment;
  residence: {
    id: string;
    name: string;
    address: string;
    city: string;
    district: string | null;
    syndicId: string;
  };
  residents: Array<{
    id: string;
    userId: string;
    apartmentId: string;
    residenceId: string;
    residentType: 'OWNER' | 'TENANT';
    isPrimary: boolean;
    startDate: string | null;
    endDate: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    user: {
      id: string;
      fullName: string;
      phone: string;
      email: string | null;
      role: string;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    };
  }>;
  payments: ApartmentProfilePayment[];
  unpaidPayments: ApartmentProfilePayment[];
  complaints: Array<{
    id: string;
    residenceId: string;
    apartmentId: string;
    residentId: string;
    category: string;
    title: string;
    description: string;
    urgency: string;
    status: ApartmentProfileComplaintStatus;
    assignedToId: string | null;
    sentToLhrayfi: boolean;
    isAnonymous: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
    resident: {
      id: string;
      fullName: string;
      phone: string;
      email: string | null;
    };
  }>;
  statistics: {
    totalDue: number;
    totalPaid: number;
    totalRemaining: number;
    unpaidCount: number;
    complaintsCount: number;
    openComplaintsCount: number;
  };
  latestActivity: Array<{
    id: string;
    type: 'PAYMENT' | 'COMPLAINT' | 'RESIDENT';
    title: string;
    subtitle: string;
    createdAt: string;
  }>;
};

export function getSyndicApartments(token: string, residenceId: string) {
  return apiRequest<SyndicApartment[]>(`/syndic/residences/${residenceId}/apartments`, {
    token,
  });
}

export function createSyndicApartment(
  token: string,
  residenceId: string,
  input: CreateSyndicApartmentInput,
) {
  return apiRequest<SyndicApartment>(`/syndic/residences/${residenceId}/apartments`, {
    method: 'POST',
    token,
    body: input,
  });
}

export function getSyndicApartment(
  token: string,
  residenceId: string,
  apartmentId: string,
) {
  return apiRequest<SyndicApartment>(
    `/syndic/residences/${residenceId}/apartments/${apartmentId}`,
    { token },
  );
}

export function getSyndicApartmentProfile(
  token: string,
  residenceId: string,
  apartmentId: string,
) {
  return apiRequest<ApartmentProfile>(
    `/syndic/residences/${residenceId}/apartments/${apartmentId}/profile`,
    { token },
  );
}

export function updateSyndicApartment(
  token: string,
  residenceId: string,
  apartmentId: string,
  input: UpdateSyndicApartmentInput,
) {
  return apiRequest<SyndicApartment>(
    `/syndic/residences/${residenceId}/apartments/${apartmentId}`,
    {
      method: 'PATCH',
      token,
      body: input,
    },
  );
}

export function updateSyndicApartmentStatus(
  token: string,
  residenceId: string,
  apartmentId: string,
  isActive: boolean,
) {
  return apiRequest<SyndicApartment>(
    `/syndic/residences/${residenceId}/apartments/${apartmentId}/status`,
    {
      method: 'PATCH',
      token,
      body: { isActive },
    },
  );
}

export function deleteSyndicApartment(
  token: string,
  residenceId: string,
  apartmentId: string,
) {
  return apiRequest<SyndicApartment>(
    `/syndic/residences/${residenceId}/apartments/${apartmentId}`,
    {
      method: 'DELETE',
      token,
    },
  );
}
