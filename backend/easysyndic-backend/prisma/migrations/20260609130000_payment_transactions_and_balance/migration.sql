-- CreateEnum
CREATE TYPE "PaymentTransactionSource" AS ENUM ('RESIDENT_DECLARATION', 'SYNDIC_ENTRY');

-- CreateEnum
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('PENDING', 'VALIDATED', 'REJECTED');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "dueDate" TIMESTAMP(3);

UPDATE "Payment"
SET "dueDate" = make_timestamp("year", "month", 1, 0, 0, 0)
WHERE "dueDate" IS NULL;

-- AlterTable
ALTER TABLE "PaymentTransaction"
  ADD COLUMN "source" "PaymentTransactionSource" NOT NULL DEFAULT 'SYNDIC_ENTRY',
  ADD COLUMN "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'VALIDATED',
  ADD COLUMN "proofUrl" TEXT,
  ADD COLUMN "validatedAt" TIMESTAMP(3),
  ADD COLUMN "validatedById" TEXT;

UPDATE "PaymentTransaction"
SET
  "validatedAt" = COALESCE("validatedAt", "createdAt"),
  "validatedById" = COALESCE("validatedById", "createdById")
WHERE "status" = 'VALIDATED';

-- AddForeignKey
ALTER TABLE "PaymentTransaction"
  ADD CONSTRAINT "PaymentTransaction_validatedById_fkey"
  FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Payment_dueDate_idx" ON "Payment"("dueDate");
CREATE INDEX "PaymentTransaction_validatedById_idx" ON "PaymentTransaction"("validatedById");
CREATE INDEX "PaymentTransaction_source_idx" ON "PaymentTransaction"("source");
CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");
