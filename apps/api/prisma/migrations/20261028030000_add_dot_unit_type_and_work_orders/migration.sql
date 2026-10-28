-- AlterTable
ALTER TABLE `AssignedUnit` ADD COLUMN `combinedDotId` VARCHAR(191) NULL,
    ADD COLUMN `dotWorkerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `CadFeature` MODIFY `feature` ENUM('BLEETER', 'TOW', 'TAXI', 'COURTHOUSE', 'TRUCK_LOGS', 'AOP', 'BUSINESS', 'ALLOW_DUPLICATE_CITIZEN_NAMES', 'DISCORD_AUTH', 'CALLS_911', 'WEAPON_REGISTRATION', 'SOCIAL_SECURITY_NUMBERS', 'CUSTOM_TEXTFIELD_VALUES', 'DISALLOW_TEXTFIELD_SELECTION', 'ACTIVE_DISPATCHERS', 'ACTIVE_INCIDENTS', 'ALLOW_CITIZEN_UPDATE_LICENSE', 'ALLOW_REGULAR_LOGIN', 'RADIO_CHANNEL_MANAGEMENT', 'ALLOW_CITIZEN_DELETION_BY_NON_ADMIN', 'DL_EXAMS', 'DMV', 'BADGE_NUMBERS', 'USER_API_TOKENS', 'CITIZEN_RECORD_APPROVAL', 'COMMON_CITIZEN_CARDS', 'STEAM_OAUTH', 'CREATE_USER_CITIZEN_LEO', 'LEO_TICKETS', 'LEO_BAIL', 'COURTHOUSE_POSTS', 'WEAPON_EXAMS', 'ACTIVE_WARRANTS', 'CITIZEN_DELETE_ON_DEAD', 'PANIC_BUTTON', 'WARRANT_STATUS_APPROVAL', 'DIVISIONS', 'TONES', 'LICENSE_EXAMS', 'CITIZEN_CREATION_RECORDS', 'BUREAU_OF_FIREARMS', 'CALL_911_APPROVAL', 'FORCE_DISCORD_AUTH', 'FORCE_STEAM_AUTH', 'EDITABLE_SSN', 'EDITABLE_VIN', 'SIGNAL_100_CITIZEN', 'FORCE_ACCOUNT_PASSWORD', 'USER_DEFINED_CALLSIGN_COMBINED_UNIT', 'HOSPITAL_SERVICES', 'MEDICAL_RECORDS_CITIZEN_MANAGEABLE', 'PETS', 'REQUIRED_CITIZEN_IMAGE', 'LEO_EDITABLE_CITIZEN_PROFILE', 'ALLOW_MULTIPLE_UNITS_DEPARTMENTS_PER_USER', 'OPEN_LAW_BOOK', 'CITIZEN_RECORD_PAYMENTS', 'MODERN_CITIZEN_THEME', 'API_TOKEN_REMINDER', 'UNIT_PRIVATE_MESSAGES', 'RADIO', 'ERLC', 'DOT') NOT NULL;

-- AlterTable
ALTER TABLE `ChatCreator` ADD COLUMN `combinedDotId` VARCHAR(191) NULL,
    ADD COLUMN `dotWorkerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `DepartmentValue` MODIFY `type` ENUM('LEO', 'EMS_FD', 'DOT') NOT NULL DEFAULT 'LEO';

-- AlterTable
ALTER TABLE `IncidentInvolvedUnit` ADD COLUMN `combinedDotId` VARCHAR(191) NULL,
    ADD COLUMN `dotWorkerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `OfficerLog` ADD COLUMN `dotWorkerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `UnitQualification` ADD COLUMN `dotWorkerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `dotLayoutOrder` JSON NOT NULL;

-- CreateTable
CREATE TABLE `CombinedDotUnit` (
    `id` VARCHAR(191) NOT NULL,
    `callsign` TEXT NOT NULL,
    `userDefinedCallsign` TEXT NULL,
    `callsign2` TEXT NULL,
    `departmentId` VARCHAR(191) NULL,
    `incremental` INTEGER NULL,
    `radioChannelId` TEXT NULL,
    `statusId` VARCHAR(191) NULL,
    `pairedUnitTemplate` VARCHAR(255) NULL,
    `activeCallId` VARCHAR(191) NULL,
    `activeIncidentId` VARCHAR(191) NULL,
    `activeVehicleId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CombinedDotUnit_statusId_idx`(`statusId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DotWorkOrder` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `location` VARCHAR(255) NOT NULL,
    `postal` VARCHAR(255) NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `departmentId` VARCHAR(191) NULL,
    `assignedWorkerId` VARCHAR(191) NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DotWorkOrder_status_priority_departmentId_idx`(`status`, `priority`, `departmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DotWorker` (
    `id` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NULL,
    `callsign` VARCHAR(255) NOT NULL,
    `callsign2` VARCHAR(255) NOT NULL,
    `incremental` INTEGER NULL,
    `userDefinedCallsign` TEXT NULL,
    `divisionId` VARCHAR(191) NULL,
    `position` TEXT NULL,
    `rankId` VARCHAR(191) NULL,
    `statusId` VARCHAR(191) NULL,
    `suspended` BOOLEAN NOT NULL DEFAULT false,
    `badgeNumber` INTEGER NULL,
    `badgeNumberString` TEXT NULL,
    `imageId` VARCHAR(255) NULL,
    `imageBlurData` TEXT NULL,
    `citizenId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `radioChannelId` TEXT NULL,
    `activeCallId` VARCHAR(191) NULL,
    `activeIncidentId` VARCHAR(191) NULL,
    `whitelistStatusId` VARCHAR(191) NULL,
    `activeVehicleId` VARCHAR(191) NULL,
    `isTemporary` BOOLEAN NOT NULL DEFAULT false,
    `identifiers` JSON NOT NULL,
    `combinedDotUnitId` VARCHAR(191) NULL,

    INDEX `DotWorker_callsign_callsign2_statusId_idx`(`callsign`, `callsign2`, `statusId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UnitQualification` ADD CONSTRAINT `UnitQualification_dotWorkerId_fkey` FOREIGN KEY (`dotWorkerId`) REFERENCES `DotWorker`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OfficerLog` ADD CONSTRAINT `OfficerLog_dotWorkerId_fkey` FOREIGN KEY (`dotWorkerId`) REFERENCES `DotWorker`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CombinedDotUnit` ADD CONSTRAINT `CombinedDotUnit_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `DepartmentValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CombinedDotUnit` ADD CONSTRAINT `CombinedDotUnit_statusId_fkey` FOREIGN KEY (`statusId`) REFERENCES `StatusValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CombinedDotUnit` ADD CONSTRAINT `CombinedDotUnit_activeCallId_fkey` FOREIGN KEY (`activeCallId`) REFERENCES `Call911`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CombinedDotUnit` ADD CONSTRAINT `CombinedDotUnit_activeIncidentId_fkey` FOREIGN KEY (`activeIncidentId`) REFERENCES `LeoIncident`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CombinedDotUnit` ADD CONSTRAINT `CombinedDotUnit_activeVehicleId_fkey` FOREIGN KEY (`activeVehicleId`) REFERENCES `EmergencyVehicleValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DotWorkOrder` ADD CONSTRAINT `DotWorkOrder_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `DepartmentValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DotWorkOrder` ADD CONSTRAINT `DotWorkOrder_assignedWorkerId_fkey` FOREIGN KEY (`assignedWorkerId`) REFERENCES `DotWorker`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatCreator` ADD CONSTRAINT `ChatCreator_dotWorkerId_fkey` FOREIGN KEY (`dotWorkerId`) REFERENCES `DotWorker`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatCreator` ADD CONSTRAINT `ChatCreator_combinedDotId_fkey` FOREIGN KEY (`combinedDotId`) REFERENCES `CombinedDotUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssignedUnit` ADD CONSTRAINT `AssignedUnit_dotWorkerId_fkey` FOREIGN KEY (`dotWorkerId`) REFERENCES `DotWorker`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssignedUnit` ADD CONSTRAINT `AssignedUnit_combinedDotId_fkey` FOREIGN KEY (`combinedDotId`) REFERENCES `CombinedDotUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IncidentInvolvedUnit` ADD CONSTRAINT `IncidentInvolvedUnit_dotWorkerId_fkey` FOREIGN KEY (`dotWorkerId`) REFERENCES `DotWorker`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IncidentInvolvedUnit` ADD CONSTRAINT `IncidentInvolvedUnit_combinedDotId_fkey` FOREIGN KEY (`combinedDotId`) REFERENCES `CombinedDotUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DotWorker` ADD CONSTRAINT `DotWorker_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `DepartmentValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DotWorker` ADD CONSTRAINT `DotWorker_divisionId_fkey` FOREIGN KEY (`divisionId`) REFERENCES `DivisionValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DotWorker` ADD CONSTRAINT `DotWorker_rankId_fkey` FOREIGN KEY (`rankId`) REFERENCES `Value`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DotWorker` ADD CONSTRAINT `DotWorker_statusId_fkey` FOREIGN KEY (`statusId`) REFERENCES `StatusValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DotWorker` ADD CONSTRAINT `DotWorker_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DotWorker` ADD CONSTRAINT `DotWorker_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DotWorker` ADD CONSTRAINT `DotWorker_activeCallId_fkey` FOREIGN KEY (`activeCallId`) REFERENCES `Call911`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DotWorker` ADD CONSTRAINT `DotWorker_activeIncidentId_fkey` FOREIGN KEY (`activeIncidentId`) REFERENCES `LeoIncident`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DotWorker` ADD CONSTRAINT `DotWorker_whitelistStatusId_fkey` FOREIGN KEY (`whitelistStatusId`) REFERENCES `LeoWhitelistStatus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DotWorker` ADD CONSTRAINT `DotWorker_activeVehicleId_fkey` FOREIGN KEY (`activeVehicleId`) REFERENCES `EmergencyVehicleValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DotWorker` ADD CONSTRAINT `DotWorker_combinedDotUnitId_fkey` FOREIGN KEY (`combinedDotUnitId`) REFERENCES `CombinedDotUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
