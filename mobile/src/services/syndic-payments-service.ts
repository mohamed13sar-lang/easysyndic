import { apiRequest } from '@/lib/api/client';

export type PaymentStatus =
  | 'PAYE'
  | 'NON_PAYE'
  | 'PARTIELLEMENT_PAYE'
  | 'EN_RETARD'
  | 'EXONERE';

export type PaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'CHECK'
  | 'CASH_PLUS'
  | 'WAFACASH'
  | 'MOBILE_PAYMENT'
  | 'OTHER';

export type PaymentTransactionSource = 'RESIDENT_DECLARATION' | 'SYNDIC_ENTRY';
export type PaymentTransactionStatus = 'PENDING' | 'VALIDATED' | 'REJECTED';

export type PaymentTransaction = {
  id: string;
  paymentId: string;
  amount: number;
  paymentMethod: PaymentMethod | null;
  source: PaymentTransactionSource;
  status: PaymentTransactionStatus;
  receiptUrl: string | null;
  proofUrl: string | null;
  note: string | null;
  paidAt: string;
  validatedAt: string | null;
  validatedById: string | null;
  createdById: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SyndicPayment = {
  id: string;
  residenceId: string;
  apartmentId: string;
  residentId: string;
  amountDue: number;
  amountPaid: number;
  remainingAmount: number;
  month: number;
  year: number;
  dueDate: string | null;
  status: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  receiptUrl: string | null;
  note: string | null;
  paidAt: string | null;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  transactions?: PaymentTransaction[];
};

export type CreateSyndicPaymentInput = {
  apartmentId: string;
  residentId: string;
  month: number;
  year: number;
  dueDate?: string;
  amountDue: number;
  amountPaid?: number;
  status?: PaymentStatus;
  paymentMethod?: PaymentMethod;
};

export type UpdateSyndicPaymentInput = {
  amountDue?: number;
  amountPaid?: number;
  status?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paidAt?: string;
  dueDate?: string;
};

export type CreateSyndicPaymentTransactionInput = {
  amount: number;
  paymentMethod?: PaymentMethod;
  paidAt?: string;
  note?: string;
  receiptUrl?: string;
  proofUrl?: string;
};

export function getSyndicPayments(token: string, residenceId: string) {
  return apiRequest<SyndicPayment[]>(`/syndic/residences/${residenceId}/payments`, {
    token,
  });
}

export function getSyndicNonPaidPayments(token: string, residenceId: string) {
  return apiRequest<SyndicPayment[]>(
    `/syndic/residences/${residenceId}/payments/non-paid`,
    {
      token,
    },
  );
}

export function createSyndicPayment(
  token: string,
  residenceId: string,
  input: CreateSyndicPaymentInput,
) {
  return apiRequest<SyndicPayment>(`/syndic/residences/${residenceId}/payments`, {
    method: 'POST',
    token,
    body: input,
  });
}

export function updateSyndicPayment(
  token: string,
  residenceId: string,
  paymentId: string,
  input: UpdateSyndicPaymentInput,
) {
  return apiRequest<SyndicPayment>(
    `/syndic/residences/${residenceId}/payments/${paymentId}`,
    {
      method: 'PATCH',
      token,
      body: input,
    },
  );
}

export function getSyndicPaymentTransactions(
  token: string,
  residenceId: string,
  paymentId: string,
) {
  return apiRequest<PaymentTransaction[]>(
    `/syndic/residences/${residenceId}/payments/${paymentId}/transactions`,
    { token },
  );
}

export function addSyndicPaymentTransaction(
  token: string,
  residenceId: string,
  paymentId: string,
  input: CreateSyndicPaymentTransactionInput,
) {
  return apiRequest<SyndicPayment>(
    `/syndic/residences/${residenceId}/payments/${paymentId}/transactions`,
    {
      method: 'POST',
      token,
      body: input,
    },
  );
}

export function validateSyndicPaymentTransaction(
  token: string,
  residenceId: string,
  paymentId: string,
  transactionId: string,
) {
  return apiRequest<SyndicPayment>(
    `/syndic/residences/${residenceId}/payments/${paymentId}/transactions/${transactionId}/validate`,
    {
      method: 'PATCH',
      token,
    },
  );
}

export function rejectSyndicPaymentTransaction(
  token: string,
  residenceId: string,
  paymentId: string,
  transactionId: string,
) {
  return apiRequest<SyndicPayment>(
    `/syndic/residences/${residenceId}/payments/${paymentId}/transactions/${transactionId}/reject`,
    {
      method: 'PATCH',
      token,
    },
  );
}
