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

export type ResidentPayment = {
  id: string;
  month: number;
  year: number;
  amountDue: number;
  amountPaid: number;
  remainingAmount: number;
  status: PaymentStatus;
  dueDate: string | null;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
  receiptUrl: string | null;
  transactions?: PaymentTransaction[];
};

export type ResidentPaymentSummaryStatus = 'DEBT' | 'BALANCED' | 'CREDIT';

export type ResidentPaymentSummary = {
  amountDueTotal: number;
  amountPaidTotal: number;
  balance: number;
  remainingToPay: number;
  creditBalance: number;
  status: ResidentPaymentSummaryStatus;
};

export type DeclarePaymentInput = {
  amount: number;
  paymentMethod?: PaymentMethod;
  proofUrl?: string;
  note?: string;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeResidentPayment(payment: ResidentPayment): ResidentPayment {
  const amountDue = toNumber(payment.amountDue);
  const amountPaid = toNumber(payment.amountPaid);
  const computedRemaining = Math.max(amountDue - amountPaid, 0);
  const remainingAmount =
    payment.status === 'PAYE' || payment.status === 'EXONERE'
      ? 0
      : toNumber(payment.remainingAmount || computedRemaining);

  return {
    ...payment,
    amountDue,
    amountPaid,
    remainingAmount,
  };
}

export async function getMyPayments(
  token: string,
  filters: { residenceId: string; apartmentId: string },
) {
  const params = new URLSearchParams({
    residenceId: filters.residenceId,
    apartmentId: filters.apartmentId,
  });

  const payments = await apiRequest<ResidentPayment[]>(`/me/payments?${params.toString()}`, {
    token,
  });

  return payments.map(normalizeResidentPayment);
}

function normalizeResidentPaymentSummary(
  summary: ResidentPaymentSummary,
): ResidentPaymentSummary {
  const amountDueTotal = toNumber(summary.amountDueTotal);
  const amountPaidTotal = toNumber(summary.amountPaidTotal);
  const balance = toNumber(summary.balance);

  return {
    amountDueTotal,
    amountPaidTotal,
    balance,
    remainingToPay: toNumber(summary.remainingToPay || Math.max(-balance, 0)),
    creditBalance: toNumber(summary.creditBalance || Math.max(balance, 0)),
    status: summary.status,
  };
}

export async function getMyPaymentsSummary(
  token: string,
  filters: { residenceId: string; apartmentId: string },
) {
  const params = new URLSearchParams({
    residenceId: filters.residenceId,
    apartmentId: filters.apartmentId,
  });

  const summary = await apiRequest<ResidentPaymentSummary>(
    `/me/payments/summary?${params.toString()}`,
    { token },
  );

  return normalizeResidentPaymentSummary(summary);
}

export async function getMyPayment(token: string, id: string) {
  const payment = await apiRequest<ResidentPayment>(`/me/payments/${id}`, {
    token,
  });

  return normalizeResidentPayment(payment);
}

export async function declareMyPayment(
  token: string,
  paymentId: string,
  input: DeclarePaymentInput,
) {
  const payment = await apiRequest<ResidentPayment>(
    `/me/payments/${paymentId}/declare-payment`,
    {
      method: 'POST',
      token,
      body: input,
    },
  );

  return normalizeResidentPayment(payment);
}
