-- CreateEnum
CREATE TYPE "DrugTestResult" AS ENUM ('POSITIVE', 'NEGATIVE', 'INCONCLUSIVE');

-- CreateTable
CREATE TABLE "CitizenAlias" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "surname" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CitizenAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CitizenDrugTest" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "officerId" TEXT,
    "substances" TEXT NOT NULL,
    "result" "DrugTestResult" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CitizenDrugTest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CitizenAlias" ADD CONSTRAINT "CitizenAlias_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenDrugTest" ADD CONSTRAINT "CitizenDrugTest_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenDrugTest" ADD CONSTRAINT "CitizenDrugTest_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
