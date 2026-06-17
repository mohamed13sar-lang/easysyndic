ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'VICE_SYNDIC';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CAISSIER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'GARDIEN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SECRETAIRE';

CREATE TABLE IF NOT EXISTS "SyndicTeamMember" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "residenceId" TEXT NOT NULL,
  "invitedById" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "permissions" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SyndicTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SyndicTeamMember_userId_residenceId_key"
  ON "SyndicTeamMember"("userId", "residenceId");

CREATE INDEX IF NOT EXISTS "SyndicTeamMember_residenceId_idx"
  ON "SyndicTeamMember"("residenceId");

CREATE INDEX IF NOT EXISTS "SyndicTeamMember_invitedById_idx"
  ON "SyndicTeamMember"("invitedById");

CREATE INDEX IF NOT EXISTS "SyndicTeamMember_role_idx"
  ON "SyndicTeamMember"("role");

CREATE INDEX IF NOT EXISTS "SyndicTeamMember_isActive_idx"
  ON "SyndicTeamMember"("isActive");

ALTER TABLE "SyndicTeamMember"
  ADD CONSTRAINT "SyndicTeamMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SyndicTeamMember"
  ADD CONSTRAINT "SyndicTeamMember_residenceId_fkey"
  FOREIGN KEY ("residenceId") REFERENCES "Residence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SyndicTeamMember"
  ADD CONSTRAINT "SyndicTeamMember_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
