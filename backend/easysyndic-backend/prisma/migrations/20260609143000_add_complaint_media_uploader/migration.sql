-- AlterTable
ALTER TABLE "ComplaintMedia" ADD COLUMN "uploadedById" TEXT;

-- AddForeignKey
ALTER TABLE "ComplaintMedia"
  ADD CONSTRAINT "ComplaintMedia_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "ComplaintMedia_uploadedById_idx" ON "ComplaintMedia"("uploadedById");
