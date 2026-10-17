-- CreateTable
CREATE TABLE "FivemCharacter" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "framework" VARCHAR(16) NOT NULL,
    "characterId" VARCHAR(191) NOT NULL,
    "citizenId" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FivemCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FivemVehicle" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "framework" VARCHAR(16) NOT NULL,
    "characterId" VARCHAR(191) NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FivemVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FivemFrameworkSettings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "syncCitizens" BOOLEAN NOT NULL DEFAULT true,
    "syncVehicles" BOOLEAN NOT NULL DEFAULT true,
    "syncDuty" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "lastServerName" VARCHAR(255),
    "lastFramework" VARCHAR(16),
    "lastVersion" VARCHAR(32),
    "disabledPhones" JSONB,
    "detectedPhones" JSONB,
    "removedVehicles" VARCHAR(16) NOT NULL DEFAULT 'delete',

    CONSTRAINT "FivemFrameworkSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FivemCharacter_citizenId_idx" ON "FivemCharacter"("citizenId");

-- CreateIndex
CREATE UNIQUE INDEX "FivemCharacter_framework_characterId_key" ON "FivemCharacter"("framework", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "FivemVehicle_vehicleId_key" ON "FivemVehicle"("vehicleId");

-- CreateIndex
CREATE INDEX "FivemVehicle_framework_characterId_idx" ON "FivemVehicle"("framework", "characterId");

-- AddForeignKey
ALTER TABLE "FivemCharacter" ADD CONSTRAINT "FivemCharacter_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FivemVehicle" ADD CONSTRAINT "FivemVehicle_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "RegisteredVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

