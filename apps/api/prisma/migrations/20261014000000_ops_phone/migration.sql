-- CreateTable
CREATE TABLE "OpsPhoneSettings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "apiUrl" VARCHAR(512),
    "apiKey" TEXT,
    "webhookSecret" VARCHAR(255) NOT NULL,
    "sendSms" BOOLEAN NOT NULL DEFAULT true,
    "serviceMap" JSONB,

    CONSTRAINT "OpsPhoneSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpsPhoneRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" INTEGER NOT NULL,
    "service" VARCHAR(64) NOT NULL,
    "serviceNumber" VARCHAR(64),
    "target" VARCHAR(32) NOT NULL,
    "callerNumber" VARCHAR(64) NOT NULL,
    "callerName" VARCHAR(255),
    "call911Id" TEXT,
    "towCallId" TEXT,
    "taxiCallId" TEXT,
    "status" VARCHAR(16) NOT NULL DEFAULT 'open',

    CONSTRAINT "OpsPhoneRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OpsPhoneRequest_requestId_key" ON "OpsPhoneRequest"("requestId");

-- CreateIndex
CREATE INDEX "OpsPhoneRequest_call911Id_idx" ON "OpsPhoneRequest"("call911Id");

-- CreateIndex
CREATE INDEX "OpsPhoneRequest_towCallId_idx" ON "OpsPhoneRequest"("towCallId");

-- CreateIndex
CREATE INDEX "OpsPhoneRequest_taxiCallId_idx" ON "OpsPhoneRequest"("taxiCallId");
