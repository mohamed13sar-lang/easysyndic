ALTER TABLE "ComplaintMedia" ADD COLUMN IF NOT EXISTS "uploadedById" TEXT;

DO $$ BEGIN
  ALTER TABLE "ComplaintMedia"
    ADD CONSTRAINT "ComplaintMedia_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "ComplaintMedia_uploadedById_idx" ON "ComplaintMedia"("uploadedById");
