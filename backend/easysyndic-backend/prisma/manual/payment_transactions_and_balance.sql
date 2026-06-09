DO $$ BEGIN
  CREATE TYPE "PaymentTransactionSource" AS ENUM ('RESIDENT_DECLARATION', 'SYNDIC_ENTRY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentTransactionStatus" AS ENUM ('PENDING', 'VALIDATED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);

UPDATE "Payment"
SET "dueDate" = make_timestamp("year", "month", 1, 0, 0, 0)
WHERE "dueDate" IS NULL;

ALTER TABLE "PaymentTransaction"
  ADD COLUMN IF NOT EXISTS "source" "PaymentTransactionSource" NOT NULL DEFAULT 'SYNDIC_ENTRY',
  ADD COLUMN IF NOT EXISTS "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'VALIDATED',
  ADD COLUMN IF NOT EXISTS "proofUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "validatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "validatedById" TEXT;

UPDATE "PaymentTransaction"
SET
  "validatedAt" = COALESCE("validatedAt", "createdAt"),
  "validatedById" = COALESCE("validatedById", "createdById")
WHERE "status" = 'VALIDATED';

DO $$ BEGIN
  ALTER TABLE "PaymentTransaction"
    ADD CONSTRAINT "PaymentTransaction_validatedById_fkey"
    FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Payment_dueDate_idx" ON "Payment"("dueDate");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_validatedById_idx" ON "PaymentTransaction"("validatedById");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_source_idx" ON "PaymentTransaction"("source");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");
