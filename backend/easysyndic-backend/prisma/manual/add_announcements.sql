DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AnnouncementType') THEN
    CREATE TYPE "AnnouncementType" AS ENUM (
      'ASSEMBLEE_GENERALE',
      'DECES',
      'COUPURE_ELECTRICITE',
      'COUPURE_EAU',
      'TRAVAUX',
      'NETTOYAGE',
      'SECURITE',
      'AUTRE'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AnnouncementPriority') THEN
    CREATE TYPE "AnnouncementPriority" AS ENUM (
      'NORMAL',
      'IMPORTANT',
      'URGENT'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Announcement" (
  "id" TEXT NOT NULL,
  "residenceId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" "AnnouncementType" NOT NULL,
  "priority" "AnnouncementPriority" NOT NULL DEFAULT 'NORMAL',
  "publishAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Announcement_residenceId_idx" ON "Announcement"("residenceId");
CREATE INDEX IF NOT EXISTS "Announcement_createdById_idx" ON "Announcement"("createdById");
CREATE INDEX IF NOT EXISTS "Announcement_type_idx" ON "Announcement"("type");
CREATE INDEX IF NOT EXISTS "Announcement_priority_idx" ON "Announcement"("priority");
CREATE INDEX IF NOT EXISTS "Announcement_publishAt_idx" ON "Announcement"("publishAt");
CREATE INDEX IF NOT EXISTS "Announcement_expiresAt_idx" ON "Announcement"("expiresAt");
CREATE INDEX IF NOT EXISTS "Announcement_isActive_idx" ON "Announcement"("isActive");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Announcement_residenceId_fkey'
  ) THEN
    ALTER TABLE "Announcement"
      ADD CONSTRAINT "Announcement_residenceId_fkey"
      FOREIGN KEY ("residenceId") REFERENCES "Residence"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Announcement_createdById_fkey'
  ) THEN
    ALTER TABLE "Announcement"
      ADD CONSTRAINT "Announcement_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
