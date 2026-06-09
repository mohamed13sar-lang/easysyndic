DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'PaymentMethod'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public."PaymentMethod" AS ENUM (
      'CASH',
      'BANK_TRANSFER',
      'CHECK',
      'CASH_PLUS',
      'WAFACASH',
      'MOBILE_PAYMENT',
      'OTHER'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public."PaymentTransaction" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "paymentMethod" public."PaymentMethod",
  "receiptUrl" TEXT,
  "note" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL,
  "createdById" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PaymentTransaction_paymentId_idx"
  ON public."PaymentTransaction"("paymentId");

CREATE INDEX IF NOT EXISTS "PaymentTransaction_createdById_idx"
  ON public."PaymentTransaction"("createdById");

CREATE INDEX IF NOT EXISTS "PaymentTransaction_paidAt_idx"
  ON public."PaymentTransaction"("paidAt");

CREATE INDEX IF NOT EXISTS "PaymentTransaction_isActive_idx"
  ON public."PaymentTransaction"("isActive");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PaymentTransaction_paymentId_fkey'
  ) THEN
    ALTER TABLE public."PaymentTransaction"
      ADD CONSTRAINT "PaymentTransaction_paymentId_fkey"
      FOREIGN KEY ("paymentId")
      REFERENCES public."Payment"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PaymentTransaction_createdById_fkey'
  ) THEN
    ALTER TABLE public."PaymentTransaction"
      ADD CONSTRAINT "PaymentTransaction_createdById_fkey"
      FOREIGN KEY ("createdById")
      REFERENCES public."User"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;
