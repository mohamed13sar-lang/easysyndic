CREATE TYPE "DocumentType" AS ENUM (
  'ASSEMBLEE_GENERALE',
  'PV',
  'FACTURE',
  'TRAVAUX',
  'CONTRAT',
  'GENERAL'
);

ALTER TABLE "ComplaintMedia"
  ADD COLUMN IF NOT EXISTS "storagePath" TEXT;

CREATE TABLE IF NOT EXISTS "Document" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" "DocumentType" NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER,
  "storagePath" TEXT NOT NULL,
  "residenceId" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Document_residenceId_idx" ON "Document"("residenceId");
CREATE INDEX IF NOT EXISTS "Document_uploadedById_idx" ON "Document"("uploadedById");
CREATE INDEX IF NOT EXISTS "Document_type_idx" ON "Document"("type");
CREATE INDEX IF NOT EXISTS "Document_createdAt_idx" ON "Document"("createdAt");

ALTER TABLE "Document"
  ADD CONSTRAINT "Document_residenceId_fkey"
  FOREIGN KEY ("residenceId") REFERENCES "Residence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Document"
  ADD CONSTRAINT "Document_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "PaymentProof" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER,
  "storagePath" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PaymentProof_paymentId_idx" ON "PaymentProof"("paymentId");
CREATE INDEX IF NOT EXISTS "PaymentProof_uploadedById_idx" ON "PaymentProof"("uploadedById");
CREATE INDEX IF NOT EXISTS "PaymentProof_createdAt_idx" ON "PaymentProof"("createdAt");

ALTER TABLE "PaymentProof"
  ADD CONSTRAINT "PaymentProof_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentProof"
  ADD CONSTRAINT "PaymentProof_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
