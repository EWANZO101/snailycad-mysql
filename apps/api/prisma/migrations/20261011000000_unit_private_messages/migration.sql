-- AlterEnum
ALTER TYPE "Feature" ADD VALUE 'UNIT_PRIVATE_MESSAGES';

-- CreateTable
CREATE TABLE "UnitPrivateMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "senderUnitId" TEXT NOT NULL,
    "recipientUnitId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "UnitPrivateMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnitPrivateMessage_senderUnitId_recipientUnitId_idx" ON "UnitPrivateMessage"("senderUnitId", "recipientUnitId");

-- CreateIndex
CREATE INDEX "UnitPrivateMessage_recipientUnitId_readAt_idx" ON "UnitPrivateMessage"("recipientUnitId", "readAt");
