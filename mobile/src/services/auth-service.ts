import { apiRequest } from '@/lib/api/client';

export type AuthUser = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  role: 'SUPER_ADMIN' | 'SYNDIC' | 'RESIDENT' | 'PROVIDER' | 'CASHIER';
  isActive: boolean;
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

export type SendOtpResponse = {
  success: boolean;
  message: string;
};

export function sendOtp(phone: string) {
  return apiRequest<SendOtpResponse>('/auth/send-otp', {
    method: 'POST',
    body: { phone },
  });
}

export function loginWithPassword(identifier: string, password: string) {
  return apiRequest<AuthSession>('/auth/login', {
    method: 'POST',
    body: { identifier, password },
  });
}

export function getCurrentUser(token: string) {
  return apiRequest<AuthUser>('/auth/me', {
    token,
  });
}

export function verifyOtp(phone: string, code: string) {
  return apiRequest<AuthSession>('/auth/verify-otp', {
    method: 'POST',
    body: { phone, code },
  });
}
