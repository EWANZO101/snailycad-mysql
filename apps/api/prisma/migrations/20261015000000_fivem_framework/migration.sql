-- CreateTable
CREATE TABLE `FivemCharacter` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `framework` VARCHAR(16) NOT NULL,
    `characterId` VARCHAR(191) NOT NULL,
    `citizenId` VARCHAR(191) NOT NULL,
    `lastSyncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FivemCharacter_citizenId_idx`(`citizenId`),
    UNIQUE INDEX `FivemCharacter_framework_characterId_key`(`framework`, `characterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FivemVehicle` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `framework` VARCHAR(16) NOT NULL,
    `characterId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `lastSyncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `FivemVehicle_vehicleId_key`(`vehicleId`),
    INDEX `FivemVehicle_framework_characterId_idx`(`framework`, `characterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FivemFrameworkSettings` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `syncCitizens` BOOLEAN NOT NULL DEFAULT true,
    `syncVehicles` BOOLEAN NOT NULL DEFAULT true,
    `syncDuty` BOOLEAN NOT NULL DEFAULT true,
    `lastSyncAt` DATETIME(3) NULL,
    `lastServerName` VARCHAR(255) NULL,
    `lastFramework` VARCHAR(16) NULL,
    `lastVersion` VARCHAR(32) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FivemCharacter` ADD CONSTRAINT `FivemCharacter_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FivemVehicle` ADD CONSTRAINT `FivemVehicle_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `RegisteredVehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

