-- AlterEnum
ALTER TYPE "Feature" ADD VALUE 'ERLC';

-- CreateTable
CREATE TABLE "ErlcSettings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "serverKey" TEXT,
    "apiKey" TEXT,
    "pollSeconds" INTEGER NOT NULL DEFAULT 15,
    "create911Calls" BOOLEAN NOT NULL DEFAULT true,
    "teamMap" JSONB,
    "pausedReason" VARCHAR(64),
    "pausedAt" TIMESTAMP(3),

    CONSTRAINT "ErlcSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErlcEmergencyCall" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "callNumber" INTEGER NOT NULL,
    "startedAt" INTEGER NOT NULL,
    "team" VARCHAR(64) NOT NULL,
    "callerId" VARCHAR(32),
    "target" VARCHAR(32) NOT NULL,
    "call911Id" TEXT,
    "towCallId" TEXT,

    CONSTRAINT "ErlcEmergencyCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ErlcEmergencyCall_call911Id_idx" ON "ErlcEmergencyCall"("call911Id");

-- CreateIndex
CREATE UNIQUE INDEX "ErlcEmergencyCall_callNumber_startedAt_key" ON "ErlcEmergencyCall"("callNumber", "startedAt");

