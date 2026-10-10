-- CreateEnum
CREATE TYPE "EmsFdReportType" AS ENUM ('MEDICAL', 'FIRE', 'FIRE_INVESTIGATION', 'INSPECTION');

-- AlterTable
ALTER TABLE "EmsFdIncident" ADD COLUMN     "reportType" "EmsFdReportType" NOT NULL DEFAULT 'MEDICAL',
ADD COLUMN     "causeOfFire" TEXT,
ADD COLUMN     "propertyDamage" VARCHAR(255),
ADD COLUMN     "inspectionResult" VARCHAR(255);
