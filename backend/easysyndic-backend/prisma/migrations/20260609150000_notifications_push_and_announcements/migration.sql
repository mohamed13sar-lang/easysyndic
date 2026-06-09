ALTER TYPE "NotificationType" ADD VALUE 'NEW_ANNOUNCEMENT';

CREATE TABLE "UserPushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expoPushToken" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPushToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPushToken_expoPushToken_key" ON "UserPushToken"("expoPushToken");
CREATE INDEX "UserPushToken_userId_idx" ON "UserPushToken"("userId");
CREATE INDEX "UserPushToken_platform_idx" ON "UserPushToken"("platform");
CREATE INDEX "UserPushToken_isActive_idx" ON "UserPushToken"("isActive");

ALTER TABLE "UserPushToken" ADD CONSTRAINT "UserPushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
