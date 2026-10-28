-- AlterEnum
ALTER TYPE "DashboardLayoutCardType" ADD VALUE 'ACTIVE_DOT';

-- AlterEnum
ALTER TYPE "DepartmentType" ADD VALUE 'DOT';

-- AlterEnum
ALTER TYPE "Feature" ADD VALUE 'DOT';

-- AlterTable
ALTER TABLE "AssignedUnit" ADD COLUMN     "combinedDotId" TEXT,
ADD COLUMN     "dotWorkerId" TEXT;

-- AlterTable
ALTER TABLE "ChatCreator" ADD COLUMN     "combinedDotId" TEXT,
ADD COLUMN     "dotWorkerId" TEXT;

-- AlterTable
ALTER TABLE "IncidentInvolvedUnit" ADD COLUMN     "combinedDotId" TEXT,
ADD COLUMN     "dotWorkerId" TEXT;

-- AlterTable
ALTER TABLE "OfficerLog" ADD COLUMN     "dotWorkerId" TEXT;

-- AlterTable
ALTER TABLE "UnitQualification" ADD COLUMN     "dotWorkerId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dotLayoutOrder" "DashboardLayoutCardType"[];

-- CreateTable
CREATE TABLE "CombinedDotUnit" (
    "id" TEXT NOT NULL,
    "callsign" TEXT NOT NULL,
    "userDefinedCallsign" TEXT,
    "callsign2" TEXT,
    "departmentId" TEXT,
    "incremental" INTEGER,
    "radioChannelId" TEXT,
    "statusId" TEXT,
    "pairedUnitTemplate" TEXT,
    "activeCallId" TEXT,
    "activeIncidentId" TEXT,
    "activeVehicleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CombinedDotUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DotWorker" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT,
    "callsign" VARCHAR(255) NOT NULL,
    "callsign2" VARCHAR(255) NOT NULL,
    "incremental" INTEGER,
    "userDefinedCallsign" TEXT,
    "divisionId" TEXT,
    "position" TEXT,
    "rankId" TEXT,
    "statusId" TEXT,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "badgeNumber" INTEGER,
    "badgeNumberString" TEXT,
    "imageId" VARCHAR(255),
    "imageBlurData" TEXT,
    "citizenId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "radioChannelId" TEXT,
    "activeCallId" TEXT,
    "activeIncidentId" TEXT,
    "whitelistStatusId" TEXT,
    "activeVehicleId" TEXT,
    "isTemporary" BOOLEAN NOT NULL DEFAULT false,
    "identifiers" TEXT[],
    "combinedDotUnitId" TEXT,

    CONSTRAINT "DotWorker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CombinedDotUnit_statusId_idx" ON "CombinedDotUnit"("statusId");

-- CreateIndex
CREATE INDEX "DotWorker_callsign_callsign2_statusId_idx" ON "DotWorker"("callsign", "callsign2", "statusId");

-- AddForeignKey
ALTER TABLE "UnitQualification" ADD CONSTRAINT "UnitQualification_dotWorkerId_fkey" FOREIGN KEY ("dotWorkerId") REFERENCES "DotWorker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficerLog" ADD CONSTRAINT "OfficerLog_dotWorkerId_fkey" FOREIGN KEY ("dotWorkerId") REFERENCES "DotWorker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombinedDotUnit" ADD CONSTRAINT "CombinedDotUnit_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "DepartmentValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombinedDotUnit" ADD CONSTRAINT "CombinedDotUnit_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "StatusValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombinedDotUnit" ADD CONSTRAINT "CombinedDotUnit_activeCallId_fkey" FOREIGN KEY ("activeCallId") REFERENCES "Call911"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombinedDotUnit" ADD CONSTRAINT "CombinedDotUnit_activeIncidentId_fkey" FOREIGN KEY ("activeIncidentId") REFERENCES "LeoIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombinedDotUnit" ADD CONSTRAINT "CombinedDotUnit_activeVehicleId_fkey" FOREIGN KEY ("activeVehicleId") REFERENCES "EmergencyVehicleValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatCreator" ADD CONSTRAINT "ChatCreator_dotWorkerId_fkey" FOREIGN KEY ("dotWorkerId") REFERENCES "DotWorker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatCreator" ADD CONSTRAINT "ChatCreator_combinedDotId_fkey" FOREIGN KEY ("combinedDotId") REFERENCES "CombinedDotUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedUnit" ADD CONSTRAINT "AssignedUnit_dotWorkerId_fkey" FOREIGN KEY ("dotWorkerId") REFERENCES "DotWorker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedUnit" ADD CONSTRAINT "AssignedUnit_combinedDotId_fkey" FOREIGN KEY ("combinedDotId") REFERENCES "CombinedDotUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentInvolvedUnit" ADD CONSTRAINT "IncidentInvolvedUnit_dotWorkerId_fkey" FOREIGN KEY ("dotWorkerId") REFERENCES "DotWorker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentInvolvedUnit" ADD CONSTRAINT "IncidentInvolvedUnit_combinedDotId_fkey" FOREIGN KEY ("combinedDotId") REFERENCES "CombinedDotUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DotWorker" ADD CONSTRAINT "DotWorker_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "DepartmentValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DotWorker" ADD CONSTRAINT "DotWorker_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "DivisionValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DotWorker" ADD CONSTRAINT "DotWorker_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "Value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DotWorker" ADD CONSTRAINT "DotWorker_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "StatusValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DotWorker" ADD CONSTRAINT "DotWorker_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DotWorker" ADD CONSTRAINT "DotWorker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DotWorker" ADD CONSTRAINT "DotWorker_activeCallId_fkey" FOREIGN KEY ("activeCallId") REFERENCES "Call911"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DotWorker" ADD CONSTRAINT "DotWorker_activeIncidentId_fkey" FOREIGN KEY ("activeIncidentId") REFERENCES "LeoIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DotWorker" ADD CONSTRAINT "DotWorker_whitelistStatusId_fkey" FOREIGN KEY ("whitelistStatusId") REFERENCES "LeoWhitelistStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DotWorker" ADD CONSTRAINT "DotWorker_activeVehicleId_fkey" FOREIGN KEY ("activeVehicleId") REFERENCES "EmergencyVehicleValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DotWorker" ADD CONSTRAINT "DotWorker_combinedDotUnitId_fkey" FOREIGN KEY ("combinedDotUnitId") REFERENCES "CombinedDotUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

