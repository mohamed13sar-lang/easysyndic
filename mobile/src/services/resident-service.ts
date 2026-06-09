import { apiRequest } from '@/lib/api/client';

export type ResidentResidence = {
  relationId: string;
  id: string;
  name: string;
  address: string;
  city: string;
  district: string | null;
  isActive: boolean;
  residentType: 'OWNER' | 'TENANT';
  isPrimary: boolean;
  relationIsActive: boolean;
  startDate: string | null;
  endDate: string | null;
  monthlyFee: number | null;
  apartment: {
    id: string;
    number: string;
    floor: number | null;
    block: string | null;
    surface: number | null;
    monthlyFee: number | null;
    isActive: boolean;
  };
};

export type ResidentResidencesResponse = {
  user: {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    role: 'RESIDENT';
    isActive: boolean;
  };
  residences: ResidentResidence[];
  activeRelation: ResidentResidence | null;
};

export function getMyResidences(token: string) {
  return apiRequest<ResidentResidencesResponse>('/me/residences', {
    token,
  });
}
