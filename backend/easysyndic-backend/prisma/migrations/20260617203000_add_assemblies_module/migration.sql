DO $$ BEGIN
  CREATE TYPE "AssemblyType" AS ENUM ('ORDINAIRE', 'EXTRAORDINAIRE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AssemblyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'CLOSED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ParticipantStatus" AS ENUM ('INVITED', 'PRESENT', 'ABSENT', 'REPRESENTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ResolutionVotingStatus" AS ENUM ('NOT_STARTED', 'OPEN', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AssemblyVoteValue" AS ENUM ('YES', 'NO', 'ABSTAIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "AssemblyGeneral" (
  "id" TEXT NOT NULL,
  "residenceId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" "AssemblyType" NOT NULL DEFAULT 'ORDINAIRE',
  "status" "AssemblyStatus" NOT NULL DEFAULT 'DRAFT',
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "location" TEXT NOT NULL,
  "meetingLink" TEXT,
  "quorumRequired" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssemblyGeneral_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AssemblyAgendaItem" (
  "id" TEXT NOT NULL,
  "assemblyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssemblyAgendaItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AssemblyDocument" (
  "id" TEXT NOT NULL,
  "assemblyId" TEXT NOT NULL,
  "documentId" TEXT,
  "title" TEXT NOT NULL,
  "fileName" TEXT,
  "storagePath" TEXT,
  "mimeType" TEXT,
  "size" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssemblyDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AssemblyParticipant" (
  "id" TEXT NOT NULL,
  "assemblyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "apartmentId" TEXT,
  "status" "ParticipantStatus" NOT NULL DEFAULT 'INVITED',
  "representedByName" TEXT,
  "proxyDocumentUrl" TEXT,
  "checkedInAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssemblyParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AssemblyResolution" (
  "id" TEXT NOT NULL,
  "assemblyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL,
  "votingStatus" "ResolutionVotingStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssemblyResolution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AssemblyVote" (
  "id" TEXT NOT NULL,
  "resolutionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "apartmentId" TEXT,
  "vote" "AssemblyVoteValue" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssemblyVote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AssemblyGeneral_residenceId_idx" ON "AssemblyGeneral"("residenceId");
CREATE INDEX IF NOT EXISTS "AssemblyGeneral_createdById_idx" ON "AssemblyGeneral"("createdById");
CREATE INDEX IF NOT EXISTS "AssemblyGeneral_status_idx" ON "AssemblyGeneral"("status");
CREATE INDEX IF NOT EXISTS "AssemblyGeneral_scheduledAt_idx" ON "AssemblyGeneral"("scheduledAt");
CREATE INDEX IF NOT EXISTS "AssemblyAgendaItem_assemblyId_idx" ON "AssemblyAgendaItem"("assemblyId");
CREATE INDEX IF NOT EXISTS "AssemblyAgendaItem_order_idx" ON "AssemblyAgendaItem"("order");
CREATE INDEX IF NOT EXISTS "AssemblyDocument_assemblyId_idx" ON "AssemblyDocument"("assemblyId");
CREATE INDEX IF NOT EXISTS "AssemblyDocument_documentId_idx" ON "AssemblyDocument"("documentId");
CREATE UNIQUE INDEX IF NOT EXISTS "AssemblyParticipant_assemblyId_userId_apartmentId_key" ON "AssemblyParticipant"("assemblyId", "userId", "apartmentId");
CREATE INDEX IF NOT EXISTS "AssemblyParticipant_assemblyId_idx" ON "AssemblyParticipant"("assemblyId");
CREATE INDEX IF NOT EXISTS "AssemblyParticipant_userId_idx" ON "AssemblyParticipant"("userId");
CREATE INDEX IF NOT EXISTS "AssemblyParticipant_apartmentId_idx" ON "AssemblyParticipant"("apartmentId");
CREATE INDEX IF NOT EXISTS "AssemblyParticipant_status_idx" ON "AssemblyParticipant"("status");
CREATE INDEX IF NOT EXISTS "AssemblyResolution_assemblyId_idx" ON "AssemblyResolution"("assemblyId");
CREATE INDEX IF NOT EXISTS "AssemblyResolution_order_idx" ON "AssemblyResolution"("order");
CREATE INDEX IF NOT EXISTS "AssemblyResolution_votingStatus_idx" ON "AssemblyResolution"("votingStatus");
CREATE UNIQUE INDEX IF NOT EXISTS "AssemblyVote_resolutionId_userId_apartmentId_key" ON "AssemblyVote"("resolutionId", "userId", "apartmentId");
CREATE INDEX IF NOT EXISTS "AssemblyVote_resolutionId_idx" ON "AssemblyVote"("resolutionId");
CREATE INDEX IF NOT EXISTS "AssemblyVote_userId_idx" ON "AssemblyVote"("userId");
CREATE INDEX IF NOT EXISTS "AssemblyVote_apartmentId_idx" ON "AssemblyVote"("apartmentId");
CREATE INDEX IF NOT EXISTS "AssemblyVote_vote_idx" ON "AssemblyVote"("vote");

ALTER TABLE "AssemblyGeneral" ADD CONSTRAINT "AssemblyGeneral_residenceId_fkey" FOREIGN KEY ("residenceId") REFERENCES "Residence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssemblyGeneral" ADD CONSTRAINT "AssemblyGeneral_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssemblyAgendaItem" ADD CONSTRAINT "AssemblyAgendaItem_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "AssemblyGeneral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssemblyDocument" ADD CONSTRAINT "AssemblyDocument_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "AssemblyGeneral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssemblyDocument" ADD CONSTRAINT "AssemblyDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssemblyParticipant" ADD CONSTRAINT "AssemblyParticipant_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "AssemblyGeneral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssemblyParticipant" ADD CONSTRAINT "AssemblyParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssemblyParticipant" ADD CONSTRAINT "AssemblyParticipant_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssemblyResolution" ADD CONSTRAINT "AssemblyResolution_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "AssemblyGeneral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssemblyVote" ADD CONSTRAINT "AssemblyVote_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "AssemblyResolution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssemblyVote" ADD CONSTRAINT "AssemblyVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssemblyVote" ADD CONSTRAINT "AssemblyVote_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
