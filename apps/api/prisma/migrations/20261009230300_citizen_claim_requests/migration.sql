-- CreateTable
CREATE TABLE "CitizenClaimRequest" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "WhitelistStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CitizenClaimRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CitizenClaimRequest_citizenId_status_idx" ON "CitizenClaimRequest"("citizenId", "status");

-- CreateIndex
CREATE INDEX "CitizenClaimRequest_userId_status_idx" ON "CitizenClaimRequest"("userId", "status");

-- AddForeignKey
ALTER TABLE "CitizenClaimRequest" ADD CONSTRAINT "CitizenClaimRequest_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenClaimRequest" ADD CONSTRAINT "CitizenClaimRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenClaimRequest" ADD CONSTRAINT "CitizenClaimRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
