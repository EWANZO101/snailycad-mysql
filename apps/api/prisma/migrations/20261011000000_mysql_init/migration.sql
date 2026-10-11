-- CreateTable
CREATE TABLE `cad` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `areaOfPlay` VARCHAR(255) NULL,
    `steamApiKey` VARCHAR(255) NULL,
    `whitelisted` BOOLEAN NOT NULL DEFAULT false,
    `towWhitelisted` BOOLEAN NOT NULL DEFAULT false,
    `taxiWhitelisted` BOOLEAN NOT NULL DEFAULT false,
    `businessWhitelisted` BOOLEAN NOT NULL DEFAULT false,
    `logoId` TEXT NULL,
    `registrationCode` TEXT NULL,
    `miscCadSettingsId` VARCHAR(191) NULL,
    `apiTokenId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `autoSetUserPropertiesId` VARCHAR(191) NULL,
    `discordRolesId` VARCHAR(191) NULL,
    `timeZone` VARCHAR(255) NULL DEFAULT 'UTC',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CadFeature` (
    `id` VARCHAR(191) NOT NULL,
    `feature` ENUM('BLEETER', 'TOW', 'TAXI', 'COURTHOUSE', 'TRUCK_LOGS', 'AOP', 'BUSINESS', 'ALLOW_DUPLICATE_CITIZEN_NAMES', 'DISCORD_AUTH', 'CALLS_911', 'WEAPON_REGISTRATION', 'SOCIAL_SECURITY_NUMBERS', 'CUSTOM_TEXTFIELD_VALUES', 'DISALLOW_TEXTFIELD_SELECTION', 'ACTIVE_DISPATCHERS', 'ACTIVE_INCIDENTS', 'ALLOW_CITIZEN_UPDATE_LICENSE', 'ALLOW_REGULAR_LOGIN', 'RADIO_CHANNEL_MANAGEMENT', 'ALLOW_CITIZEN_DELETION_BY_NON_ADMIN', 'DL_EXAMS', 'DMV', 'BADGE_NUMBERS', 'USER_API_TOKENS', 'CITIZEN_RECORD_APPROVAL', 'COMMON_CITIZEN_CARDS', 'STEAM_OAUTH', 'CREATE_USER_CITIZEN_LEO', 'LEO_TICKETS', 'LEO_BAIL', 'COURTHOUSE_POSTS', 'WEAPON_EXAMS', 'ACTIVE_WARRANTS', 'CITIZEN_DELETE_ON_DEAD', 'PANIC_BUTTON', 'WARRANT_STATUS_APPROVAL', 'DIVISIONS', 'TONES', 'LICENSE_EXAMS', 'CITIZEN_CREATION_RECORDS', 'BUREAU_OF_FIREARMS', 'CALL_911_APPROVAL', 'FORCE_DISCORD_AUTH', 'FORCE_STEAM_AUTH', 'EDITABLE_SSN', 'EDITABLE_VIN', 'SIGNAL_100_CITIZEN', 'FORCE_ACCOUNT_PASSWORD', 'USER_DEFINED_CALLSIGN_COMBINED_UNIT', 'HOSPITAL_SERVICES', 'MEDICAL_RECORDS_CITIZEN_MANAGEABLE', 'PETS', 'REQUIRED_CITIZEN_IMAGE', 'LEO_EDITABLE_CITIZEN_PROFILE', 'ALLOW_MULTIPLE_UNITS_DEPARTMENTS_PER_USER', 'OPEN_LAW_BOOK', 'CITIZEN_RECORD_PAYMENTS', 'MODERN_CITIZEN_THEME', 'API_TOKEN_REMINDER', 'UNIT_PRIVATE_MESSAGES') NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT false,
    `cadId` VARCHAR(191) NULL,
    `extraFields` JSON NULL,

    UNIQUE INDEX `CadFeature_feature_key`(`feature`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MiscCadSettings` (
    `id` VARCHAR(191) NOT NULL,
    `cadOGDescription` TEXT NULL,
    `heightPrefix` VARCHAR(255) NOT NULL DEFAULT 'cm',
    `weightPrefix` VARCHAR(255) NOT NULL DEFAULT 'kg',
    `maxCitizensPerUser` INTEGER NULL,
    `maxOfficersPerUser` INTEGER NULL,
    `maxPlateLength` INTEGER NOT NULL DEFAULT 8,
    `maxBusinessesPerCitizen` INTEGER NULL,
    `maxDivisionsPerOfficer` INTEGER NULL,
    `maxDepartmentsEachPerUser` INTEGER NULL,
    `maxAssignmentsToIncidents` INTEGER NULL,
    `maxAssignmentsToCalls` INTEGER NULL,
    `callsignTemplate` VARCHAR(255) NOT NULL DEFAULT '{department}{callsign1} - {callsign2}{division}',
    `caseNumberTemplate` TEXT NULL,
    `pairedUnitTemplate` VARCHAR(255) NULL DEFAULT '1A-{callsign1}',
    `pairedUnitSymbol` VARCHAR(255) NULL DEFAULT 'A',
    `signal100Enabled` BOOLEAN NOT NULL DEFAULT false,
    `liveMapURL` TEXT NULL,
    `roleplayEnabled` BOOLEAN NULL DEFAULT true,
    `authScreenBgImageId` TEXT NULL,
    `authScreenHeaderImageId` TEXT NULL,
    `jailTimeScale` ENUM('HOURS', 'MINUTES', 'SECONDS') NULL,
    `signal100RepeatAmount` INTEGER NULL DEFAULT 1,
    `signal100RepeatIntervalMs` INTEGER NULL DEFAULT 1000,
    `call911InactivityTimeout` INTEGER NULL,
    `incidentInactivityTimeout` INTEGER NULL,
    `unitInactivityTimeout` INTEGER NULL,
    `boloInactivityTimeout` INTEGER NULL,
    `activeWarrantsInactivityTimeout` INTEGER NULL,
    `activeDispatchersInactivityTimeout` INTEGER NULL,
    `driversLicenseNumberLength` INTEGER NULL DEFAULT 8,
    `driversLicenseTemplate` TEXT NULL,
    `pilotLicenseNumberLength` INTEGER NULL DEFAULT 6,
    `pilotLicenseTemplate` TEXT NULL,
    `weaponLicenseNumberLength` INTEGER NULL DEFAULT 8,
    `weaponLicenseTemplate` TEXT NULL,
    `waterLicenseNumberLength` INTEGER NULL DEFAULT 8,
    `waterLicenseTemplate` TEXT NULL,
    `huntingLicenseNumberLength` INTEGER NULL DEFAULT 8,
    `huntingLicenseTemplate` TEXT NULL,
    `fishingLicenseNumberLength` INTEGER NULL DEFAULT 8,
    `fishingLicenseTemplate` TEXT NULL,
    `driversLicenseMaxPoints` INTEGER NULL DEFAULT 12,
    `pilotLicenseMaxPoints` INTEGER NULL DEFAULT 12,
    `weaponLicenseMaxPoints` INTEGER NULL DEFAULT 12,
    `waterLicenseMaxPoints` INTEGER NULL DEFAULT 12,
    `fishingLicenseMaxPoints` INTEGER NULL DEFAULT 12,
    `huntingLicenseMaxPoints` INTEGER NULL DEFAULT 12,
    `lastInactivitySyncTimestamp` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LiveMapURL` (
    `id` VARCHAR(191) NOT NULL,
    `url` TEXT NOT NULL,
    `name` TEXT NOT NULL,
    `miscCadSettingsId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RawWebhook` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('CALL_911', 'PANIC_BUTTON', 'UNIT_STATUS', 'BOLO', 'CITIZEN_RECORD', 'VEHICLE_IMPOUNDED', 'WARRANTS', 'BLEETER_POST', 'CITIZEN_DECLARED_DEAD', 'DEPARTMENT_WHITELIST_STATUS', 'USER_WHITELIST_STATUS', 'LEO_INCIDENT_CREATED', 'EMS_FD_INCIDENT_CREATED', 'USER_REGISTERED', 'USER_BAN_STATUS', 'BOLO_UPDATED', 'BOLO_DELETED', 'WARRANT_STATUS_CHANGED', 'CALL_911_ENDED', 'CITIZEN_CREATED', 'CITIZEN_DELETED', 'EXPUNGEMENT_REQUEST_STATUS', 'TOW_CALL_CREATED', 'TAXI_CALL_CREATED') NOT NULL,
    `url` TEXT NOT NULL,
    `miscCadSettingsId` VARCHAR(191) NULL,

    UNIQUE INDEX `RawWebhook_type_key`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DiscordWebhook` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('CALL_911', 'PANIC_BUTTON', 'UNIT_STATUS', 'BOLO', 'CITIZEN_RECORD', 'VEHICLE_IMPOUNDED', 'WARRANTS', 'BLEETER_POST', 'CITIZEN_DECLARED_DEAD', 'DEPARTMENT_WHITELIST_STATUS', 'USER_WHITELIST_STATUS', 'LEO_INCIDENT_CREATED', 'EMS_FD_INCIDENT_CREATED', 'USER_REGISTERED', 'USER_BAN_STATUS', 'BOLO_UPDATED', 'BOLO_DELETED', 'WARRANT_STATUS_CHANGED', 'CALL_911_ENDED', 'CITIZEN_CREATED', 'CITIZEN_DELETED', 'EXPUNGEMENT_REQUEST_STATUS', 'TOW_CALL_CREATED', 'TAXI_CALL_CREATED') NOT NULL,
    `webhookId` TEXT NULL,
    `channelId` TEXT NOT NULL,
    `extraMessage` TEXT NULL,
    `miscCadSettingsId` VARCHAR(191) NULL,

    UNIQUE INDEX `DiscordWebhook_type_key`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AutoSetPropertiesUser` (
    `id` VARCHAR(191) NOT NULL,
    `leo` BOOLEAN NULL DEFAULT false,
    `dispatch` BOOLEAN NULL DEFAULT false,
    `emsFd` BOOLEAN NULL DEFAULT false,
    `defaultPermissions` JSON NOT NULL DEFAULT (json_array()),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApiToken` (
    `id` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `token` TEXT NULL,
    `routes` JSON NOT NULL DEFAULT (json_array()),
    `uses` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApiTokenLog` (
    `id` VARCHAR(191) NOT NULL,
    `apiTokenId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `statusCode` TEXT NULL,
    `route` TEXT NULL,
    `method` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DiscordRoles` (
    `id` VARCHAR(191) NOT NULL,
    `guildId` TEXT NOT NULL,
    `whitelistedRoleId` VARCHAR(191) NULL,
    `adminRolePermissions` JSON NOT NULL DEFAULT (json_array()),
    `leoRolePermissions` JSON NOT NULL DEFAULT (json_array()),
    `leoSupervisorRolePermissions` JSON NOT NULL DEFAULT (json_array()),
    `emsFdRolePermissions` JSON NOT NULL DEFAULT (json_array()),
    `dispatchRolePermissions` JSON NOT NULL DEFAULT (json_array()),
    `towRolePermissions` JSON NOT NULL DEFAULT (json_array()),
    `taxiRolePermissions` JSON NOT NULL DEFAULT (json_array()),
    `courthouseRolePermissions` JSON NOT NULL DEFAULT (json_array()),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DiscordRole` (
    `id` VARCHAR(191) NOT NULL,
    `name` TEXT NOT NULL,
    `guildId` TEXT NULL,
    `discordRolesId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `DiscordRole_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlacklistedWord` (
    `id` VARCHAR(191) NOT NULL,
    `word` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BlacklistedWord_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `executorId` VARCHAR(191) NULL,
    `action` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `translationKey` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `password` TEXT NOT NULL,
    `rank` ENUM('OWNER', 'ADMIN', 'USER') NOT NULL DEFAULT 'USER',
    `banned` BOOLEAN NOT NULL DEFAULT false,
    `banReason` TEXT NULL,
    `avatarUrl` TEXT NULL,
    `steamId` VARCHAR(255) NULL,
    `whitelistStatus` ENUM('ACCEPTED', 'PENDING', 'DECLINED') NOT NULL DEFAULT 'ACCEPTED',
    `isDarkTheme` BOOLEAN NOT NULL DEFAULT true,
    `tempPassword` TEXT NULL,
    `statusViewMode` ENUM('FULL_ROW_COLOR', 'DOT_COLOR') NOT NULL DEFAULT 'DOT_COLOR',
    `tableActionsAlignment` ENUM('NONE', 'LEFT', 'RIGHT') NOT NULL DEFAULT 'RIGHT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `discordId` TEXT NULL,
    `lastDiscordSyncTimestamp` DATETIME(3) NULL,
    `permissions` JSON NOT NULL DEFAULT (json_array()),
    `soundSettingsId` VARCHAR(191) NULL,
    `apiTokenId` VARCHAR(191) NULL,
    `locale` TEXT NULL,
    `lastSeen` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `developerMode` BOOLEAN NOT NULL DEFAULT false,
    `dispatchLayoutOrder` JSON NOT NULL DEFAULT (json_array()),
    `emsFdLayoutOrder` JSON NOT NULL DEFAULT (json_array()),
    `officerLayoutOrder` JSON NOT NULL DEFAULT (json_array()),

    UNIQUE INDEX `User_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserSession` (
    `id` VARCHAR(191) NOT NULL,
    `refreshToken` VARCHAR(512) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserSession_refreshToken_key`(`refreshToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ToAddDefaultPermissions` (
    `id` VARCHAR(191) NOT NULL,
    `key` ENUM('MANAGE_WARRANTS_PERMISSIONS', 'MANAGE_AWARDS_AND_QUALIFICATIONS') NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `permissions` JSON NOT NULL DEFAULT (json_array()),
    `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ToAddDefaultPermissions_key_userId_key`(`key`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserSoundSettings` (
    `id` VARCHAR(191) NOT NULL,
    `speech` BOOLEAN NOT NULL DEFAULT true,
    `speechVoice` TEXT NULL,
    `panicButton` BOOLEAN NOT NULL DEFAULT true,
    `signal100` BOOLEAN NOT NULL DEFAULT true,
    `addedToCall` BOOLEAN NOT NULL DEFAULT false,
    `stopRoleplay` BOOLEAN NOT NULL DEFAULT false,
    `statusUpdate` BOOLEAN NOT NULL DEFAULT false,
    `incomingCall` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User2FA` (
    `id` VARCHAR(191) NOT NULL,
    `secret` TEXT NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Citizen` (
    `id` VARCHAR(191) NOT NULL,
    `socialSecurityNumber` TEXT NULL,
    `userId` VARCHAR(191) NULL,
    `name` VARCHAR(255) NOT NULL,
    `surname` VARCHAR(255) NOT NULL,
    `dateOfBirth` DATETIME(3) NOT NULL,
    `genderId` VARCHAR(191) NULL,
    `ethnicityId` VARCHAR(191) NULL,
    `hairColor` VARCHAR(255) NOT NULL,
    `eyeColor` VARCHAR(255) NOT NULL,
    `address` VARCHAR(255) NOT NULL,
    `postal` VARCHAR(255) NULL,
    `height` VARCHAR(255) NOT NULL,
    `weight` VARCHAR(255) NOT NULL,
    `driversLicenseId` VARCHAR(191) NULL,
    `driversLicenseNumber` TEXT NULL,
    `weaponLicenseId` VARCHAR(191) NULL,
    `weaponLicenseNumber` TEXT NULL,
    `pilotLicenseId` VARCHAR(191) NULL,
    `pilotLicenseNumber` TEXT NULL,
    `waterLicenseId` VARCHAR(191) NULL,
    `waterLicenseNumber` TEXT NULL,
    `huntingLicenseId` VARCHAR(191) NULL,
    `huntingLicenseNumber` TEXT NULL,
    `fishingLicenseId` VARCHAR(191) NULL,
    `fishingLicenseNumber` TEXT NULL,
    `ccwId` VARCHAR(191) NULL,
    `imageId` TEXT NULL,
    `imageBlurData` TEXT NULL,
    `note` TEXT NULL,
    `dead` BOOLEAN NULL DEFAULT false,
    `dateOfDead` DATETIME(3) NULL,
    `missing` BOOLEAN NULL DEFAULT false,
    `dateOfMissing` DATETIME(3) NULL,
    `arrested` BOOLEAN NULL DEFAULT false,
    `phoneNumber` TEXT NULL,
    `occupation` TEXT NULL,
    `additionalInfo` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `appearance` TEXT NULL,
    `licensePointsId` VARCHAR(191) NULL,
    `suspendedLicensesId` VARCHAR(191) NULL,

    INDEX `fullname`(`name`, `surname`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CitizenAlias` (
    `id` VARCHAR(191) NOT NULL,
    `citizenId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `surname` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CitizenDrugTest` (
    `id` VARCHAR(191) NOT NULL,
    `citizenId` VARCHAR(191) NOT NULL,
    `officerId` VARCHAR(191) NULL,
    `substances` TEXT NOT NULL,
    `result` ENUM('POSITIVE', 'NEGATIVE', 'INCONCLUSIVE') NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CitizenClaimRequest` (
    `id` VARCHAR(191) NOT NULL,
    `citizenId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACCEPTED', 'PENDING', 'DECLINED') NOT NULL DEFAULT 'PENDING',
    `reason` TEXT NULL,
    `reviewedById` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CitizenClaimRequest_citizenId_status_idx`(`citizenId`, `status`),
    INDEX `CitizenClaimRequest_userId_status_idx`(`userId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CitizenLicensePoints` (
    `id` VARCHAR(191) NOT NULL,
    `driverLicensePoints` INTEGER NOT NULL DEFAULT 0,
    `pilotLicensePoints` INTEGER NOT NULL DEFAULT 0,
    `waterLicensePoints` INTEGER NOT NULL DEFAULT 0,
    `huntingLicensePoints` INTEGER NOT NULL DEFAULT 0,
    `fishingLicensePoints` INTEGER NOT NULL DEFAULT 0,
    `firearmsLicensePoints` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SuspendedCitizenLicenses` (
    `id` VARCHAR(191) NOT NULL,
    `driverLicense` BOOLEAN NOT NULL DEFAULT false,
    `driverLicenseTimeEnd` DATETIME(3) NULL,
    `pilotLicense` BOOLEAN NOT NULL DEFAULT false,
    `pilotLicenseTimeEnd` DATETIME(3) NULL,
    `waterLicense` BOOLEAN NOT NULL DEFAULT false,
    `waterLicenseTimeEnd` DATETIME(3) NULL,
    `fishingLicense` BOOLEAN NOT NULL DEFAULT false,
    `fishingLicenseTimeEnd` DATETIME(3) NULL,
    `huntingLicense` BOOLEAN NOT NULL DEFAULT false,
    `huntingLicenseTimeEnd` DATETIME(3) NULL,
    `firearmsLicense` BOOLEAN NOT NULL DEFAULT false,
    `firearmsLicenseTimeEnd` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pet` (
    `id` VARCHAR(191) NOT NULL,
    `name` TEXT NOT NULL,
    `breed` VARCHAR(255) NOT NULL,
    `color` VARCHAR(255) NOT NULL,
    `weight` VARCHAR(255) NOT NULL,
    `dateOfBirth` DATETIME(3) NOT NULL,
    `citizenId` VARCHAR(191) NOT NULL,
    `imageId` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Note` (
    `id` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdById` VARCHAR(191) NULL,
    `citizenId` VARCHAR(191) NULL,
    `vehicleId` VARCHAR(191) NULL,
    `petId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RegisteredVehicle` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `citizenId` VARCHAR(191) NULL,
    `vinNumber` VARCHAR(255) NOT NULL,
    `plate` VARCHAR(255) NOT NULL,
    `modelId` VARCHAR(191) NOT NULL,
    `color` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `registrationStatusId` VARCHAR(191) NOT NULL,
    `insuranceStatusId` VARCHAR(191) NULL,
    `inspectionStatus` ENUM('PASSED', 'FAILED') NULL,
    `taxStatus` ENUM('TAXED', 'UNTAXED') NULL,
    `reportedStolen` BOOLEAN NOT NULL DEFAULT false,
    `impounded` BOOLEAN NOT NULL DEFAULT false,
    `dmvStatus` ENUM('ACCEPTED', 'PENDING', 'DECLINED') NULL,
    `appearance` TEXT NULL,
    `imageId` TEXT NULL,

    UNIQUE INDEX `RegisteredVehicle_vinNumber_key`(`vinNumber`),
    UNIQUE INDEX `RegisteredVehicle_plate_key`(`plate`),
    INDEX `RegisteredVehicle_plate_vinNumber_idx`(`plate`, `vinNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Weapon` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `citizenId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `serialNumber` VARCHAR(255) NOT NULL,
    `registrationStatusId` VARCHAR(191) NOT NULL,
    `bofStatus` ENUM('ACCEPTED', 'PENDING', 'DECLINED') NULL,
    `modelId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Weapon_serialNumber_key`(`serialNumber`),
    INDEX `Weapon_serialNumber_idx`(`serialNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MedicalRecord` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `citizenId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `type` TEXT NULL,
    `description` TEXT NULL,
    `descriptionData` JSON NULL,
    `bloodGroupId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PetMedicalRecord` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `petId` VARCHAR(191) NOT NULL,
    `type` TEXT NULL,
    `description` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DoctorVisit` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `citizenId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diagnosis` TEXT NULL,
    `description` TEXT NULL,
    `conditions` TEXT NULL,
    `medications` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Value` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('LICENSE', 'GENDER', 'ETHNICITY', 'VEHICLE', 'WEAPON', 'BLOOD_GROUP', 'BUSINESS_ROLE', 'CODES_10', 'PENAL_CODE', 'DEPARTMENT', 'OFFICER_RANK', 'DIVISION', 'DRIVERSLICENSE_CATEGORY', 'IMPOUND_LOT', 'VEHICLE_FLAG', 'CITIZEN_FLAG', 'QUALIFICATION', 'CALL_TYPE', 'ADDRESS', 'EMERGENCY_VEHICLE', 'ADDRESS_FLAG', 'VEHICLE_TRIM_LEVEL', 'WEAPON_FLAG') NOT NULL,
    `value` VARCHAR(255) NOT NULL,
    `isDefault` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `position` INTEGER NULL,
    `isDisabled` BOOLEAN NOT NULL DEFAULT false,
    `licenseType` ENUM('LICENSE', 'REGISTRATION_STATUS', 'INSURANCE_STATUS') NULL,
    `officerRankImageId` TEXT NULL,
    `officerRankImageBlurData` TEXT NULL,

    INDEX `Value_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AddressValue` (
    `id` VARCHAR(191) NOT NULL,
    `valueId` VARCHAR(191) NOT NULL,
    `county` TEXT NULL,
    `postal` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PenalCode` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `descriptionData` JSON NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT true,
    `type` ENUM('INFRACTION', 'MISDEMEANOR', 'FELONY') NULL,
    `warningApplicableId` VARCHAR(191) NULL,
    `warningNotApplicableId` VARCHAR(191) NULL,
    `position` INTEGER NULL,
    `groupId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PenalCodeGroup` (
    `id` VARCHAR(191) NOT NULL,
    `position` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `name` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WarningApplicable` (
    `id` VARCHAR(191) NOT NULL,
    `fines` JSON NOT NULL DEFAULT (json_array()),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WarningNotApplicable` (
    `id` VARCHAR(191) NOT NULL,
    `fines` JSON NOT NULL DEFAULT (json_array()),
    `prisonTerm` JSON NOT NULL DEFAULT (json_array()),
    `bail` JSON NOT NULL DEFAULT (json_array()),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Violation` (
    `id` VARCHAR(191) NOT NULL,
    `fine` INTEGER NULL,
    `jailTime` INTEGER NULL,
    `bail` INTEGER NULL,
    `communityService` TEXT NULL,
    `penalCodeId` VARCHAR(191) NULL,
    `counts` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeizedItem` (
    `id` VARCHAR(191) NOT NULL,
    `recordId` VARCHAR(191) NOT NULL,
    `item` TEXT NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `illegal` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DivisionValue` (
    `id` VARCHAR(191) NOT NULL,
    `valueId` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NULL,
    `callsign` TEXT NULL,
    `pairedUnitTemplate` VARCHAR(255) NULL,
    `extraFields` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DepartmentValue` (
    `id` VARCHAR(191) NOT NULL,
    `valueId` VARCHAR(191) NOT NULL,
    `callsign` TEXT NULL,
    `customTemplate` TEXT NULL,
    `whitelisted` BOOLEAN NOT NULL DEFAULT false,
    `isDefaultDepartment` BOOLEAN NOT NULL DEFAULT false,
    `type` ENUM('LEO', 'EMS_FD') NOT NULL DEFAULT 'LEO',
    `statusValueId` VARCHAR(191) NULL,
    `defaultOfficerRankId` VARCHAR(191) NULL,
    `isConfidential` BOOLEAN NOT NULL DEFAULT false,
    `extraFields` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DepartmentValueLink` (
    `id` VARCHAR(191) NOT NULL,
    `title` TEXT NOT NULL,
    `url` TEXT NOT NULL,
    `departmentId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmergencyVehicleValue` (
    `id` VARCHAR(191) NOT NULL,
    `valueId` VARCHAR(191) NOT NULL,
    `extraFields` JSON NULL,
    `description` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DriversLicenseCategoryValue` (
    `id` VARCHAR(191) NOT NULL,
    `valueId` VARCHAR(191) NOT NULL,
    `type` ENUM('AUTOMOTIVE', 'AVIATION', 'WATER', 'FIREARM', 'HUNTING', 'FISHING', 'OTHER') NOT NULL,
    `description` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VehicleValue` (
    `id` VARCHAR(191) NOT NULL,
    `valueId` VARCHAR(191) NOT NULL,
    `hash` TEXT NULL,
    `imageId` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WeaponValue` (
    `id` VARCHAR(191) NOT NULL,
    `valueId` VARCHAR(191) NOT NULL,
    `hash` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CallTypeValue` (
    `id` VARCHAR(191) NOT NULL,
    `priority` TEXT NULL,
    `valueId` VARCHAR(191) NOT NULL,
    `isDisposition` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `executorId` VARCHAR(191) NULL,
    `title` TEXT NOT NULL,
    `description` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BleeterProfile` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `handle` VARCHAR(255) NOT NULL,
    `isVerified` BOOLEAN NULL DEFAULT false,
    `bio` TEXT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BleeterProfile_handle_key`(`handle`),
    UNIQUE INDEX `BleeterProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BleeterProfileFollow` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `followerProfileId` VARCHAR(191) NULL,
    `followingProfileId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BleeterPost` (
    `id` VARCHAR(191) NOT NULL,
    `creatorId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `body` TEXT NULL,
    `bodyData` JSON NULL,
    `imageId` VARCHAR(255) NULL,
    `imageBlurData` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TowCall` (
    `id` VARCHAR(191) NOT NULL,
    `userId` TEXT NULL,
    `assignedUnitId` VARCHAR(191) NULL,
    `location` VARCHAR(255) NOT NULL,
    `postal` TEXT NULL,
    `deliveryAddressId` VARCHAR(191) NULL,
    `plate` VARCHAR(255) NULL,
    `model` VARCHAR(255) NULL,
    `name` TEXT NULL,
    `description` TEXT NULL,
    `descriptionData` JSON NULL,
    `creatorId` VARCHAR(191) NULL,
    `ended` BOOLEAN NOT NULL DEFAULT false,
    `callCountyService` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxiCall` (
    `id` VARCHAR(191) NOT NULL,
    `userId` TEXT NULL,
    `assignedUnitId` VARCHAR(191) NULL,
    `location` VARCHAR(255) NOT NULL,
    `postal` TEXT NULL,
    `name` TEXT NULL,
    `description` TEXT NULL,
    `descriptionData` JSON NULL,
    `creatorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Business` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `name` VARCHAR(255) NOT NULL,
    `whitelisted` BOOLEAN NOT NULL DEFAULT false,
    `address` TEXT NOT NULL,
    `postal` VARCHAR(255) NULL,
    `status` ENUM('ACCEPTED', 'PENDING', 'DECLINED') NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Employee` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `citizenId` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NULL,
    `employeeOfTheMonth` BOOLEAN NOT NULL DEFAULT false,
    `canCreatePosts` BOOLEAN NOT NULL DEFAULT true,
    `canManageEmployees` BOOLEAN NOT NULL DEFAULT false,
    `canManageVehicles` BOOLEAN NOT NULL DEFAULT false,
    `whitelistStatus` ENUM('ACCEPTED', 'PENDING', 'DECLINED') NOT NULL DEFAULT 'ACCEPTED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusinessPost` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `body` TEXT NULL,
    `bodyData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmployeeValue` (
    `id` VARCHAR(191) NOT NULL,
    `valueId` VARCHAR(191) NOT NULL,
    `as` ENUM('OWNER', 'MANAGER', 'EMPLOYEE') NOT NULL DEFAULT 'EMPLOYEE',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Officer` (
    `id` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NULL,
    `callsign` VARCHAR(255) NOT NULL,
    `callsign2` VARCHAR(255) NOT NULL,
    `activeDivisionCallsignId` VARCHAR(191) NULL,
    `incremental` INTEGER NULL,
    `userDefinedCallsign` TEXT NULL,
    `rankId` VARCHAR(191) NULL,
    `position` TEXT NULL,
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
    `whitelistStatusId` VARCHAR(191) NULL,
    `radioChannelId` TEXT NULL,
    `activeIncidentId` VARCHAR(191) NULL,
    `activeCallId` VARCHAR(191) NULL,
    `combinedLeoUnitId` VARCHAR(191) NULL,
    `activeVehicleId` VARCHAR(191) NULL,
    `isTemporary` BOOLEAN NOT NULL DEFAULT false,
    `identifiers` JSON NOT NULL DEFAULT (json_array()),

    INDEX `Officer_callsign_callsign2_statusId_idx`(`callsign`, `callsign2`, `statusId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IndividualDivisionCallsign` (
    `id` VARCHAR(191) NOT NULL,
    `divisionId` VARCHAR(191) NULL,
    `callsign` TEXT NOT NULL,
    `callsign2` TEXT NOT NULL,
    `officerId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UnitQualification` (
    `id` VARCHAR(191) NOT NULL,
    `qualificationId` VARCHAR(191) NOT NULL,
    `suspendedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `officerId` VARCHAR(191) NULL,
    `emsFdDeputyId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QualificationValue` (
    `id` VARCHAR(191) NOT NULL,
    `imageId` TEXT NULL,
    `imageBlurData` TEXT NULL,
    `valueId` VARCHAR(191) NOT NULL,
    `departmentId` TEXT NULL,
    `description` TEXT NULL,
    `qualificationType` ENUM('QUALIFICATION', 'AWARD') NOT NULL DEFAULT 'QUALIFICATION',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeoWhitelistStatus` (
    `id` VARCHAR(191) NOT NULL,
    `status` ENUM('ACCEPTED', 'PENDING', 'DECLINED') NOT NULL,
    `departmentId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StatusValue` (
    `id` VARCHAR(191) NOT NULL,
    `valueId` VARCHAR(191) NOT NULL,
    `shouldDo` ENUM('SET_OFF_DUTY', 'SET_ON_DUTY', 'SET_ASSIGNED', 'SET_STATUS', 'PANIC_BUTTON', 'EN_ROUTE', 'ON_SCENE', 'UNAVAILABLE') NOT NULL DEFAULT 'SET_STATUS',
    `whatPages` JSON NOT NULL DEFAULT (json_array()),
    `color` TEXT NULL,
    `textColor` TEXT NULL,
    `type` ENUM('STATUS_CODE', 'SITUATION_CODE') NOT NULL DEFAULT 'STATUS_CODE',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OfficerLog` (
    `id` VARCHAR(191) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,
    `userId` TEXT NULL,
    `officerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `emsFdDeputyId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImpoundedVehicle` (
    `id` VARCHAR(191) NOT NULL,
    `registeredVehicleId` VARCHAR(191) NOT NULL,
    `valueId` VARCHAR(191) NOT NULL,
    `officerId` VARCHAR(191) NULL,
    `descriptionData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeoIncident` (
    `id` VARCHAR(191) NOT NULL,
    `caseNumber` INTEGER NOT NULL AUTO_INCREMENT,
    `description` TEXT NULL,
    `descriptionData` JSON NULL,
    `postal` TEXT NULL,
    `creatorId` VARCHAR(191) NULL,
    `firearmsInvolved` BOOLEAN NOT NULL DEFAULT false,
    `injuriesOrFatalities` BOOLEAN NOT NULL DEFAULT false,
    `arrestsMade` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `situationCodeId` VARCHAR(191) NULL,

    UNIQUE INDEX `LeoIncident_caseNumber_key`(`caseNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IncidentEvent` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `incidentId` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `emsFdIncidentId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CombinedLeoUnit` (
    `id` VARCHAR(191) NOT NULL,
    `userDefinedCallsign` TEXT NULL,
    `callsign` TEXT NOT NULL,
    `callsign2` TEXT NULL,
    `departmentId` VARCHAR(191) NULL,
    `incremental` INTEGER NULL,
    `radioChannelId` TEXT NULL,
    `statusId` VARCHAR(191) NULL,
    `pairedUnitTemplate` VARCHAR(255) NULL,
    `activeCallId` VARCHAR(191) NULL,
    `activeIncidentId` VARCHAR(191) NULL,
    `activeVehicleId` VARCHAR(191) NULL,
    `emsFdIncidentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CombinedLeoUnit_statusId_idx`(`statusId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CombinedEmsFdUnit` (
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
    `emsFdIncidentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CombinedEmsFdUnit_statusId_idx`(`statusId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActiveDispatchers` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DispatchChat` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `message` TEXT NOT NULL,
    `unitId` TEXT NOT NULL,
    `creatorId` VARCHAR(191) NULL,
    `callId` VARCHAR(191) NULL,
    `incidentId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UnitPrivateMessage` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `message` TEXT NOT NULL,
    `senderUnitId` VARCHAR(191) NOT NULL,
    `recipientUnitId` VARCHAR(191) NOT NULL,
    `readAt` DATETIME(3) NULL,

    INDEX `UnitPrivateMessage_senderUnitId_recipientUnitId_idx`(`senderUnitId`, `recipientUnitId`),
    INDEX `UnitPrivateMessage_recipientUnitId_readAt_idx`(`recipientUnitId`, `readAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatCreator` (
    `id` VARCHAR(191) NOT NULL,
    `officerId` VARCHAR(191) NULL,
    `emsFdDeputyId` VARCHAR(191) NULL,
    `combinedLeoId` VARCHAR(191) NULL,
    `combinedEmsFdId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Call911` (
    `id` VARCHAR(191) NOT NULL,
    `caseNumber` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `positionId` VARCHAR(191) NULL,
    `userId` TEXT NULL,
    `location` TEXT NOT NULL,
    `postal` TEXT NULL,
    `description` TEXT NULL,
    `descriptionData` JSON NULL,
    `name` VARCHAR(255) NOT NULL,
    `ended` BOOLEAN NULL DEFAULT false,
    `situationCodeId` VARCHAR(191) NULL,
    `dispositionCodeId` VARCHAR(191) NULL,
    `viaDispatch` BOOLEAN NULL DEFAULT false,
    `typeId` VARCHAR(191) NULL,
    `gtaMapPositionId` VARCHAR(191) NULL,
    `isSignal100` BOOLEAN NULL DEFAULT false,
    `extraFields` JSON NULL,
    `status` ENUM('ACCEPTED', 'PENDING', 'DECLINED') NULL,
    `emsFdIncidentId` VARCHAR(191) NULL,

    UNIQUE INDEX `Call911_caseNumber_key`(`caseNumber`),
    INDEX `Call911_caseNumber_idx`(`caseNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GTAMapPosition` (
    `id` VARCHAR(191) NOT NULL,
    `x` DOUBLE NOT NULL,
    `y` DOUBLE NOT NULL,
    `z` DOUBLE NOT NULL,
    `heading` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Position` (
    `id` VARCHAR(191) NOT NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssignedUnit` (
    `id` VARCHAR(191) NOT NULL,
    `isPrimary` BOOLEAN NULL DEFAULT false,
    `officerId` VARCHAR(191) NULL,
    `emsFdDeputyId` VARCHAR(191) NULL,
    `combinedLeoId` VARCHAR(191) NULL,
    `combinedEmsFdId` VARCHAR(191) NULL,
    `call911Id` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssignedWarrantOfficer` (
    `id` VARCHAR(191) NOT NULL,
    `officerId` VARCHAR(191) NULL,
    `combinedLeoId` VARCHAR(191) NULL,
    `warrantId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IncidentInvolvedUnit` (
    `id` VARCHAR(191) NOT NULL,
    `officerId` VARCHAR(191) NULL,
    `emsFdDeputyId` VARCHAR(191) NULL,
    `combinedLeoId` VARCHAR(191) NULL,
    `combinedEmsFdId` VARCHAR(191) NULL,
    `incidentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `emsFdIncidentId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Call911Event` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `call911Id` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `translationData` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bolo` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `type` ENUM('VEHICLE', 'PERSON', 'OTHER') NOT NULL,
    `description` TEXT NULL,
    `plate` VARCHAR(255) NULL,
    `model` VARCHAR(255) NULL,
    `color` VARCHAR(255) NULL,
    `name` VARCHAR(255) NULL,
    `officerId` VARCHAR(191) NULL,

    INDEX `Bolo_type_plate_name_idx`(`type`, `plate`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Record` (
    `id` VARCHAR(191) NOT NULL,
    `publishStatus` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `caseNumber` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('ARREST_REPORT', 'TICKET', 'WRITTEN_WARNING') NOT NULL,
    `citizenId` VARCHAR(191) NULL,
    `officerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `postal` VARCHAR(255) NOT NULL,
    `address` TEXT NULL,
    `notes` TEXT NULL,
    `descriptionData` JSON NULL,
    `releaseId` VARCHAR(191) NULL,
    `CourtEntryId` VARCHAR(191) NULL,
    `expungementRequestId` VARCHAR(191) NULL,
    `status` ENUM('ACCEPTED', 'PENDING', 'DECLINED') NULL DEFAULT 'ACCEPTED',
    `paymentStatus` ENUM('PAID', 'UNPAID') NULL,
    `vehicleId` VARCHAR(191) NULL,
    `vehiclePlate` TEXT NULL,
    `vehicleModel` TEXT NULL,
    `vehicleColor` TEXT NULL,
    `vehicleSpeed` TEXT NULL,
    `speedLimit` TEXT NULL,
    `vehiclePaceType` ENUM('PACE', 'RADAR', 'LASER', 'OTHER') NULL,
    `call911Id` VARCHAR(191) NULL,
    `incidentId` VARCHAR(191) NULL,
    `businessId` VARCHAR(191) NULL,
    `emsFdIncidentId` VARCHAR(191) NULL,

    UNIQUE INDEX `Record_caseNumber_key`(`caseNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecordRelease` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('TIME_OUT', 'BAIL_POSTED') NOT NULL,
    `citizenId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Warrant` (
    `id` VARCHAR(191) NOT NULL,
    `caseNumber` INTEGER NOT NULL AUTO_INCREMENT,
    `citizenId` VARCHAR(191) NOT NULL,
    `officerId` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expungementRequestId` VARCHAR(191) NULL,
    `approvalStatus` ENUM('ACCEPTED', 'PENDING', 'DECLINED') NULL DEFAULT 'ACCEPTED',

    UNIQUE INDEX `Warrant_caseNumber_key`(`caseNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecordLog` (
    `id` VARCHAR(191) NOT NULL,
    `citizenId` VARCHAR(191) NULL,
    `businessId` VARCHAR(191) NULL,
    `recordId` VARCHAR(191) NULL,
    `warrantId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExpungementRequest` (
    `id` VARCHAR(191) NOT NULL,
    `citizenId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `status` ENUM('ACCEPTED', 'DENIED', 'PENDING', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NameChangeRequest` (
    `id` VARCHAR(191) NOT NULL,
    `citizenId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `newName` TEXT NOT NULL,
    `newSurname` TEXT NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('ACCEPTED', 'PENDING', 'DECLINED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CourtEntry` (
    `id` VARCHAR(191) NOT NULL,
    `title` TEXT NOT NULL,
    `caseNumber` TEXT NOT NULL,
    `descriptionData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CourtDate` (
    `id` VARCHAR(191) NOT NULL,
    `note` TEXT NULL,
    `date` DATETIME(3) NOT NULL,
    `courtEntryId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmsFdDeputy` (
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
    `identifiers` JSON NOT NULL DEFAULT (json_array()),
    `combinedEmsFdUnitId` VARCHAR(191) NULL,

    INDEX `EmsFdDeputy_callsign_callsign2_statusId_idx`(`callsign`, `callsign2`, `statusId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmsFdIncident` (
    `id` VARCHAR(191) NOT NULL,
    `caseNumber` INTEGER NOT NULL AUTO_INCREMENT,
    `description` TEXT NULL,
    `descriptionData` JSON NULL,
    `address` TEXT NULL,
    `postal` TEXT NULL,
    `fireType` TEXT NULL,
    `reportType` ENUM('MEDICAL', 'FIRE', 'FIRE_INVESTIGATION', 'INSPECTION') NOT NULL DEFAULT 'MEDICAL',
    `causeOfFire` TEXT NULL,
    `propertyDamage` VARCHAR(255) NULL,
    `inspectionResult` VARCHAR(255) NULL,
    `creatorId` VARCHAR(191) NULL,
    `firearmsInvolved` BOOLEAN NOT NULL DEFAULT false,
    `injuriesOrFatalities` BOOLEAN NOT NULL DEFAULT false,
    `arrestsMade` BOOLEAN NOT NULL DEFAULT false,
    `vehicleInvolved` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `situationCodeId` VARCHAR(191) NULL,

    UNIQUE INDEX `EmsFdIncident_caseNumber_key`(`caseNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TruckLog` (
    `id` VARCHAR(191) NOT NULL,
    `citizenId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NULL,
    `startedAt` VARCHAR(255) NOT NULL,
    `endedAt` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LicenseExam` (
    `id` VARCHAR(191) NOT NULL,
    `theoryExam` ENUM('PASSED', 'FAILED') NULL,
    `practiceExam` ENUM('PASSED', 'FAILED') NULL,
    `status` ENUM('IN_PROGRESS', 'PASSED', 'FAILED') NOT NULL DEFAULT 'IN_PROGRESS',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `type` ENUM('DRIVER', 'FIREARM', 'WATER', 'PILOT', 'HUNTING', 'FISHING') NOT NULL,
    `citizenId` VARCHAR(191) NOT NULL,
    `licenseId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomField` (
    `id` VARCHAR(191) NOT NULL,
    `name` TEXT NOT NULL,
    `citizenEditable` BOOLEAN NOT NULL DEFAULT false,
    `category` ENUM('CITIZEN', 'WEAPON', 'VEHICLE') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomFieldValue` (
    `id` VARCHAR(191) NOT NULL,
    `value` TEXT NULL,
    `fieldId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomRole` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `iconId` TEXT NULL,
    `permissions` JSON NOT NULL DEFAULT (json_array()),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `discordRoleId` VARCHAR(191) NULL,

    UNIQUE INDEX `CustomRole_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CourthousePost` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `descriptionData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActiveTone` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('LEO', 'EMS_FD', 'SHARED') NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdById` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `ActiveTone_type_key`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TonePreset` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `name` VARCHAR(255) NOT NULL,
    `sound` TEXT NOT NULL,
    `type` ENUM('LEO', 'EMS_FD', 'SHARED') NOT NULL DEFAULT 'SHARED',
    `departmentId` VARCHAR(191) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_leoRoles` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_leoRoles_AB_unique`(`A`, `B`),
    INDEX `_leoRoles_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_emsFdRoles` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_emsFdRoles_AB_unique`(`A`, `B`),
    INDEX `_emsFdRoles_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_dispatchRoles` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_dispatchRoles_AB_unique`(`A`, `B`),
    INDEX `_dispatchRoles_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_leoSupervisorRoles` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_leoSupervisorRoles_AB_unique`(`A`, `B`),
    INDEX `_leoSupervisorRoles_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_taxiRoles` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_taxiRoles_AB_unique`(`A`, `B`),
    INDEX `_taxiRoles_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_towRoles` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_towRoles_AB_unique`(`A`, `B`),
    INDEX `_towRoles_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_courthouseRoles` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_courthouseRoles_AB_unique`(`A`, `B`),
    INDEX `_courthouseRoles_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_adminRoles` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_adminRoles_AB_unique`(`A`, `B`),
    INDEX `_adminRoles_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_dlCategoryToDLCategory` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_dlCategoryToDLCategory_AB_unique`(`A`, `B`),
    INDEX `_dlCategoryToDLCategory_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_citizenFlags` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_citizenFlags_AB_unique`(`A`, `B`),
    INDEX `_citizenFlags_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_citizenAddressFlags` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_citizenAddressFlags_AB_unique`(`A`, `B`),
    INDEX `_citizenAddressFlags_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CitizenToCustomFieldValue` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_CitizenToCustomFieldValue_AB_unique`(`A`, `B`),
    INDEX `_CitizenToCustomFieldValue_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_vehicleFlags` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_vehicleFlags_AB_unique`(`A`, `B`),
    INDEX `_vehicleFlags_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_registeredVehicleTrimLevels` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_registeredVehicleTrimLevels_AB_unique`(`A`, `B`),
    INDEX `_registeredVehicleTrimLevels_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_vehicleTrimLevels` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_vehicleTrimLevels_AB_unique`(`A`, `B`),
    INDEX `_vehicleTrimLevels_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_weaponFlags` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_weaponFlags_AB_unique`(`A`, `B`),
    INDEX `_weaponFlags_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_officerDivisionsToDivision` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_officerDivisionsToDivision_AB_unique`(`A`, `B`),
    INDEX `_officerDivisionsToDivision_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_DivisionValueToEmergencyVehicleValue` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_DivisionValueToEmergencyVehicleValue_AB_unique`(`A`, `B`),
    INDEX `_DivisionValueToEmergencyVehicleValue_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_DepartmentValueToQualificationValue` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_DepartmentValueToQualificationValue_AB_unique`(`A`, `B`),
    INDEX `_DepartmentValueToQualificationValue_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_officerRankDepartments` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_officerRankDepartments_AB_unique`(`A`, `B`),
    INDEX `_officerRankDepartments_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_DepartmentValueToEmergencyVehicleValue` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_DepartmentValueToEmergencyVehicleValue_AB_unique`(`A`, `B`),
    INDEX `_DepartmentValueToEmergencyVehicleValue_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_dlCategoryToLicenseExam` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_dlCategoryToLicenseExam_AB_unique`(`A`, `B`),
    INDEX `_dlCategoryToLicenseExam_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_registeredBusinessVehicles` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_registeredBusinessVehicles_AB_unique`(`A`, `B`),
    INDEX `_registeredBusinessVehicles_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_businessValueBusinessRoles` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_businessValueBusinessRoles_AB_unique`(`A`, `B`),
    INDEX `_businessValueBusinessRoles_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_involvedOfficers` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_involvedOfficers_AB_unique`(`A`, `B`),
    INDEX `_involvedOfficers_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_Call911ToDivisionValue` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_Call911ToDivisionValue_AB_unique`(`A`, `B`),
    INDEX `_Call911ToDivisionValue_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_Call911ToDepartmentValue` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_Call911ToDepartmentValue_AB_unique`(`A`, `B`),
    INDEX `_Call911ToDepartmentValue_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_Call911ToLeoIncident` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_Call911ToLeoIncident_AB_unique`(`A`, `B`),
    INDEX `_Call911ToLeoIncident_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_RecordToViolation` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_RecordToViolation_AB_unique`(`A`, `B`),
    INDEX `_RecordToViolation_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CustomFieldValueToRegisteredVehicle` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_CustomFieldValueToRegisteredVehicle_AB_unique`(`A`, `B`),
    INDEX `_CustomFieldValueToRegisteredVehicle_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CustomFieldValueToWeapon` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_CustomFieldValueToWeapon_AB_unique`(`A`, `B`),
    INDEX `_CustomFieldValueToWeapon_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CustomRoleToUser` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_CustomRoleToUser_AB_unique`(`A`, `B`),
    INDEX `_CustomRoleToUser_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cad` ADD CONSTRAINT `cad_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cad` ADD CONSTRAINT `cad_miscCadSettingsId_fkey` FOREIGN KEY (`miscCadSettingsId`) REFERENCES `MiscCadSettings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cad` ADD CONSTRAINT `cad_apiTokenId_fkey` FOREIGN KEY (`apiTokenId`) REFERENCES `ApiToken`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cad` ADD CONSTRAINT `cad_autoSetUserPropertiesId_fkey` FOREIGN KEY (`autoSetUserPropertiesId`) REFERENCES `AutoSetPropertiesUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cad` ADD CONSTRAINT `cad_discordRolesId_fkey` FOREIGN KEY (`discordRolesId`) REFERENCES `DiscordRoles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CadFeature` ADD CONSTRAINT `CadFeature_cadId_fkey` FOREIGN KEY (`cadId`) REFERENCES `cad`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LiveMapURL` ADD CONSTRAINT `LiveMapURL_miscCadSettingsId_fkey` FOREIGN KEY (`miscCadSettingsId`) REFERENCES `MiscCadSettings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RawWebhook` ADD CONSTRAINT `RawWebhook_miscCadSettingsId_fkey` FOREIGN KEY (`miscCadSettingsId`) REFERENCES `MiscCadSettings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiscordWebhook` ADD CONSTRAINT `DiscordWebhook_miscCadSettingsId_fkey` FOREIGN KEY (`miscCadSettingsId`) REFERENCES `MiscCadSettings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApiTokenLog` ADD CONSTRAINT `ApiTokenLog_apiTokenId_fkey` FOREIGN KEY (`apiTokenId`) REFERENCES `ApiToken`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiscordRoles` ADD CONSTRAINT `DiscordRoles_whitelistedRoleId_fkey` FOREIGN KEY (`whitelistedRoleId`) REFERENCES `DiscordRole`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiscordRole` ADD CONSTRAINT `DiscordRole_discordRolesId_fkey` FOREIGN KEY (`discordRolesId`) REFERENCES `DiscordRoles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_executorId_fkey` FOREIGN KEY (`executorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_soundSettingsId_fkey` FOREIGN KEY (`soundSettingsId`) REFERENCES `UserSoundSettings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_apiTokenId_fkey` FOREIGN KEY (`apiTokenId`) REFERENCES `ApiToken`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSession` ADD CONSTRAINT `UserSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ToAddDefaultPermissions` ADD CONSTRAINT `ToAddDefaultPermissions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User2FA` ADD CONSTRAINT `User2FA_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Citizen` ADD CONSTRAINT `Citizen_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Citizen` ADD CONSTRAINT `Citizen_genderId_fkey` FOREIGN KEY (`genderId`) REFERENCES `Value`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Citizen` ADD CONSTRAINT `Citizen_ethnicityId_fkey` FOREIGN KEY (`ethnicityId`) REFERENCES `Value`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Citizen` ADD CONSTRAINT `Citizen_driversLicenseId_fkey` FOREIGN KEY (`driversLicenseId`) REFERENCES `Value`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Citizen` ADD CONSTRAINT `Citizen_weaponLicenseId_fkey` FOREIGN KEY (`weaponLicenseId`) REFERENCES `Value`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Citizen` ADD CONSTRAINT `Citizen_pilotLicenseId_fkey` FOREIGN KEY (`pilotLicenseId`) REFERENCES `Value`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Citizen` ADD CONSTRAINT `Citizen_waterLicenseId_fkey` FOREIGN KEY (`waterLicenseId`) REFERENCES `Value`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Citizen` ADD CONSTRAINT `Citizen_huntingLicenseId_fkey` FOREIGN KEY (`huntingLicenseId`) REFERENCES `Value`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Citizen` ADD CONSTRAINT `Citizen_fishingLicenseId_fkey` FOREIGN KEY (`fishingLicenseId`) REFERENCES `Value`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Citizen` ADD CONSTRAINT `Citizen_ccwId_fkey` FOREIGN KEY (`ccwId`) REFERENCES `Value`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Citizen` ADD CONSTRAINT `Citizen_suspendedLicensesId_fkey` FOREIGN KEY (`suspendedLicensesId`) REFERENCES `SuspendedCitizenLicenses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Citizen` ADD CONSTRAINT `Citizen_licensePointsId_fkey` FOREIGN KEY (`licensePointsId`) REFERENCES `CitizenLicensePoints`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CitizenAlias` ADD CONSTRAINT `CitizenAlias_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CitizenDrugTest` ADD CONSTRAINT `CitizenDrugTest_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CitizenDrugTest` ADD CONSTRAINT `CitizenDrugTest_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `Officer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CitizenClaimRequest` ADD CONSTRAINT `CitizenClaimRequest_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CitizenClaimRequest` ADD CONSTRAINT `CitizenClaimRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CitizenClaimRequest` ADD CONSTRAINT `CitizenClaimRequest_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pet` ADD CONSTRAINT `Pet_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Note` ADD CONSTRAINT `Note_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `Officer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Note` ADD CONSTRAINT `Note_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Note` ADD CONSTRAINT `Note_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `RegisteredVehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Note` ADD CONSTRAINT `Note_petId_fkey` FOREIGN KEY (`petId`) REFERENCES `Pet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegisteredVehicle` ADD CONSTRAINT `RegisteredVehicle_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegisteredVehicle` ADD CONSTRAINT `RegisteredVehicle_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegisteredVehicle` ADD CONSTRAINT `RegisteredVehicle_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `VehicleValue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegisteredVehicle` ADD CONSTRAINT `RegisteredVehicle_registrationStatusId_fkey` FOREIGN KEY (`registrationStatusId`) REFERENCES `Value`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegisteredVehicle` ADD CONSTRAINT `RegisteredVehicle_insuranceStatusId_fkey` FOREIGN KEY (`insuranceStatusId`) REFERENCES `Value`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Weapon` ADD CONSTRAINT `Weapon_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Weapon` ADD CONSTRAINT `Weapon_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Weapon` ADD CONSTRAINT `Weapon_registrationStatusId_fkey` FOREIGN KEY (`registrationStatusId`) REFERENCES `Value`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Weapon` ADD CONSTRAINT `Weapon_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `WeaponValue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MedicalRecord` ADD CONSTRAINT `MedicalRecord_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MedicalRecord` ADD CONSTRAINT `MedicalRecord_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MedicalRecord` ADD CONSTRAINT `MedicalRecord_bloodGroupId_fkey` FOREIGN KEY (`bloodGroupId`) REFERENCES `Value`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PetMedicalRecord` ADD CONSTRAINT `PetMedicalRecord_petId_fkey` FOREIGN KEY (`petId`) REFERENCES `Pet`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DoctorVisit` ADD CONSTRAINT `DoctorVisit_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DoctorVisit` ADD CONSTRAINT `DoctorVisit_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AddressValue` ADD CONSTRAINT `AddressValue_valueId_fkey` FOREIGN KEY (`valueId`) REFERENCES `Value`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PenalCode` ADD CONSTRAINT `PenalCode_warningApplicableId_fkey` FOREIGN KEY (`warningApplicableId`) REFERENCES `WarningApplicable`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PenalCode` ADD CONSTRAINT `PenalCode_warningNotApplicableId_fkey` FOREIGN KEY (`warningNotApplicableId`) REFERENCES `WarningNotApplicable`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PenalCode` ADD CONSTRAINT `PenalCode_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `PenalCodeGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Violation` ADD CONSTRAINT `Violation_penalCodeId_fkey` FOREIGN KEY (`penalCodeId`) REFERENCES `PenalCode`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SeizedItem` ADD CONSTRAINT `SeizedItem_recordId_fkey` FOREIGN KEY (`recordId`) REFERENCES `Record`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DivisionValue` ADD CONSTRAINT `DivisionValue_valueId_fkey` FOREIGN KEY (`valueId`) REFERENCES `Value`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DivisionValue` ADD CONSTRAINT `DivisionValue_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `DepartmentValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DepartmentValue` ADD CONSTRAINT `DepartmentValue_valueId_fkey` FOREIGN KEY (`valueId`) REFERENCES `Value`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DepartmentValue` ADD CONSTRAINT `DepartmentValue_statusValueId_fkey` FOREIGN KEY (`statusValueId`) REFERENCES `StatusValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DepartmentValue` ADD CONSTRAINT `DepartmentValue_defaultOfficerRankId_fkey` FOREIGN KEY (`defaultOfficerRankId`) REFERENCES `Value`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DepartmentValueLink` ADD CONSTRAINT `DepartmentValueLink_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `DepartmentValue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmergencyVehicleValue` ADD CONSTRAINT `EmergencyVehicleValue_valueId_fkey` FOREIGN KEY (`valueId`) REFERENCES `Value`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DriversLicenseCategoryValue` ADD CONSTRAINT `DriversLicenseCategoryValue_valueId_fkey` FOREIGN KEY (`valueId`) REFERENCES `Value`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VehicleValue` ADD CONSTRAINT `VehicleValue_valueId_fkey` FOREIGN KEY (`valueId`) REFERENCES `Value`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeaponValue` ADD CONSTRAINT `WeaponValue_valueId_fkey` FOREIGN KEY (`valueId`) REFERENCES `Value`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CallTypeValue` ADD CONSTRAINT `CallTypeValue_valueId_fkey` FOREIGN KEY (`valueId`) REFERENCES `Value`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_executorId_fkey` FOREIGN KEY (`executorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BleeterProfile` ADD CONSTRAINT `BleeterProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BleeterProfileFollow` ADD CONSTRAINT `BleeterProfileFollow_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BleeterProfileFollow` ADD CONSTRAINT `BleeterProfileFollow_followerProfileId_fkey` FOREIGN KEY (`followerProfileId`) REFERENCES `BleeterProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BleeterProfileFollow` ADD CONSTRAINT `BleeterProfileFollow_followingProfileId_fkey` FOREIGN KEY (`followingProfileId`) REFERENCES `BleeterProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BleeterPost` ADD CONSTRAINT `BleeterPost_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `BleeterProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BleeterPost` ADD CONSTRAINT `BleeterPost_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TowCall` ADD CONSTRAINT `TowCall_assignedUnitId_fkey` FOREIGN KEY (`assignedUnitId`) REFERENCES `Citizen`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TowCall` ADD CONSTRAINT `TowCall_deliveryAddressId_fkey` FOREIGN KEY (`deliveryAddressId`) REFERENCES `Value`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TowCall` ADD CONSTRAINT `TowCall_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `Citizen`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxiCall` ADD CONSTRAINT `TaxiCall_assignedUnitId_fkey` FOREIGN KEY (`assignedUnitId`) REFERENCES `Citizen`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxiCall` ADD CONSTRAINT `TaxiCall_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `Citizen`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Business` ADD CONSTRAINT `Business_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `EmployeeValue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessPost` ADD CONSTRAINT `BusinessPost_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessPost` ADD CONSTRAINT `BusinessPost_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessPost` ADD CONSTRAINT `BusinessPost_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeValue` ADD CONSTRAINT `EmployeeValue_valueId_fkey` FOREIGN KEY (`valueId`) REFERENCES `Value`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Officer` ADD CONSTRAINT `Officer_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `DepartmentValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Officer` ADD CONSTRAINT `Officer_activeDivisionCallsignId_fkey` FOREIGN KEY (`activeDivisionCallsignId`) REFERENCES `IndividualDivisionCallsign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Officer` ADD CONSTRAINT `Officer_rankId_fkey` FOREIGN KEY (`rankId`) REFERENCES `Value`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Officer` ADD CONSTRAINT `Officer_statusId_fkey` FOREIGN KEY (`statusId`) REFERENCES `StatusValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Officer` ADD CONSTRAINT `Officer_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Officer` ADD CONSTRAINT `Officer_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Officer` ADD CONSTRAINT `Officer_whitelistStatusId_fkey` FOREIGN KEY (`whitelistStatusId`) REFERENCES `LeoWhitelistStatus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Officer` ADD CONSTRAINT `Officer_activeIncidentId_fkey` FOREIGN KEY (`activeIncidentId`) REFERENCES `LeoIncident`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Officer` ADD CONSTRAINT `Officer_activeCallId_fkey` FOREIGN KEY (`activeCallId`) REFERENCES `Call911`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Officer` ADD CONSTRAINT `Officer_combinedLeoUnitId_fkey` FOREIGN KEY (`combinedLeoUnitId`) REFERENCES `CombinedLeoUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Officer` ADD CONSTRAINT `Officer_activeVehicleId_fkey` FOREIGN KEY (`activeVehicleId`) REFERENCES `EmergencyVehicleValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IndividualDivisionCallsign` ADD CONSTRAINT `IndividualDivisionCallsign_divisionId_fkey` FOREIGN KEY (`divisionId`) REFERENCES `DivisionValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IndividualDivisionCallsign` ADD CONSTRAINT `IndividualDivisionCallsign_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `Officer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UnitQualification` ADD CONSTRAINT `UnitQualification_qualificationId_fkey` FOREIGN KEY (`qualificationId`) REFERENCES `QualificationValue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UnitQualification` ADD CONSTRAINT `UnitQualification_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `Officer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UnitQualification` ADD CONSTRAINT `UnitQualification_emsFdDeputyId_fkey` FOREIGN KEY (`emsFdDeputyId`) REFERENCES `EmsFdDeputy`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QualificationValue` ADD CONSTRAINT `QualificationValue_valueId_fkey` FOREIGN KEY (`valueId`) REFERENCES `Value`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeoWhitelistStatus` ADD CONSTRAINT `LeoWhitelistStatus_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `DepartmentValue`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StatusValue` ADD CONSTRAINT `StatusValue_valueId_fkey` FOREIGN KEY (`valueId`) REFERENCES `Value`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OfficerLog` ADD CONSTRAINT `OfficerLog_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `Officer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OfficerLog` ADD CONSTRAINT `OfficerLog_emsFdDeputyId_fkey` FOREIGN KEY (`emsFdDeputyId`) REFERENCES `EmsFdDeputy`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImpoundedVehicle` ADD CONSTRAINT `ImpoundedVehicle_registeredVehicleId_fkey` FOREIGN KEY (`registeredVehicleId`) REFERENCES `RegisteredVehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImpoundedVehicle` ADD CONSTRAINT `ImpoundedVehicle_valueId_fkey` FOREIGN KEY (`valueId`) REFERENCES `Value`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImpoundedVehicle` ADD CONSTRAINT `ImpoundedVehicle_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `Officer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeoIncident` ADD CONSTRAINT `LeoIncident_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `Officer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeoIncident` ADD CONSTRAINT `LeoIncident_situationCodeId_fkey` FOREIGN KEY (`situationCodeId`) REFERENCES `StatusValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IncidentEvent` ADD CONSTRAINT `IncidentEvent_incidentId_fkey` FOREIGN KEY (`incidentId`) REFERENCES `LeoIncident`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IncidentEvent` ADD CONSTRAINT `IncidentEvent_emsFdIncidentId_fkey` FOREIGN KEY (`emsFdIncidentId`) REFERENCES `EmsFdIncident`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CombinedLeoUnit` ADD CONSTRAINT `CombinedLeoUnit_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `DepartmentValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CombinedLeoUnit` ADD CONSTRAINT `CombinedLeoUnit_statusId_fkey` FOREIGN KEY (`statusId`) REFERENCES `StatusValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CombinedLeoUnit` ADD CONSTRAINT `CombinedLeoUnit_activeCallId_fkey` FOREIGN KEY (`activeCallId`) REFERENCES `Call911`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CombinedLeoUnit` ADD CONSTRAINT `CombinedLeoUnit_activeIncidentId_fkey` FOREIGN KEY (`activeIncidentId`) REFERENCES `LeoIncident`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CombinedLeoUnit` ADD CONSTRAINT `CombinedLeoUnit_activeVehicleId_fkey` FOREIGN KEY (`activeVehicleId`) REFERENCES `EmergencyVehicleValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CombinedLeoUnit` ADD CONSTRAINT `CombinedLeoUnit_emsFdIncidentId_fkey` FOREIGN KEY (`emsFdIncidentId`) REFERENCES `EmsFdIncident`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CombinedEmsFdUnit` ADD CONSTRAINT `CombinedEmsFdUnit_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `DepartmentValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CombinedEmsFdUnit` ADD CONSTRAINT `CombinedEmsFdUnit_statusId_fkey` FOREIGN KEY (`statusId`) REFERENCES `StatusValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CombinedEmsFdUnit` ADD CONSTRAINT `CombinedEmsFdUnit_activeCallId_fkey` FOREIGN KEY (`activeCallId`) REFERENCES `Call911`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CombinedEmsFdUnit` ADD CONSTRAINT `CombinedEmsFdUnit_activeIncidentId_fkey` FOREIGN KEY (`activeIncidentId`) REFERENCES `LeoIncident`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CombinedEmsFdUnit` ADD CONSTRAINT `CombinedEmsFdUnit_activeVehicleId_fkey` FOREIGN KEY (`activeVehicleId`) REFERENCES `EmergencyVehicleValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CombinedEmsFdUnit` ADD CONSTRAINT `CombinedEmsFdUnit_emsFdIncidentId_fkey` FOREIGN KEY (`emsFdIncidentId`) REFERENCES `EmsFdIncident`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActiveDispatchers` ADD CONSTRAINT `ActiveDispatchers_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActiveDispatchers` ADD CONSTRAINT `ActiveDispatchers_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `DepartmentValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DispatchChat` ADD CONSTRAINT `DispatchChat_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `ChatCreator`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DispatchChat` ADD CONSTRAINT `DispatchChat_callId_fkey` FOREIGN KEY (`callId`) REFERENCES `Call911`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DispatchChat` ADD CONSTRAINT `DispatchChat_incidentId_fkey` FOREIGN KEY (`incidentId`) REFERENCES `LeoIncident`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatCreator` ADD CONSTRAINT `ChatCreator_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `Officer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatCreator` ADD CONSTRAINT `ChatCreator_emsFdDeputyId_fkey` FOREIGN KEY (`emsFdDeputyId`) REFERENCES `EmsFdDeputy`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatCreator` ADD CONSTRAINT `ChatCreator_combinedLeoId_fkey` FOREIGN KEY (`combinedLeoId`) REFERENCES `CombinedLeoUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatCreator` ADD CONSTRAINT `ChatCreator_combinedEmsFdId_fkey` FOREIGN KEY (`combinedEmsFdId`) REFERENCES `CombinedEmsFdUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Call911` ADD CONSTRAINT `Call911_positionId_fkey` FOREIGN KEY (`positionId`) REFERENCES `Position`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Call911` ADD CONSTRAINT `Call911_situationCodeId_fkey` FOREIGN KEY (`situationCodeId`) REFERENCES `StatusValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Call911` ADD CONSTRAINT `Call911_dispositionCodeId_fkey` FOREIGN KEY (`dispositionCodeId`) REFERENCES `CallTypeValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Call911` ADD CONSTRAINT `Call911_typeId_fkey` FOREIGN KEY (`typeId`) REFERENCES `CallTypeValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Call911` ADD CONSTRAINT `Call911_gtaMapPositionId_fkey` FOREIGN KEY (`gtaMapPositionId`) REFERENCES `GTAMapPosition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Call911` ADD CONSTRAINT `Call911_emsFdIncidentId_fkey` FOREIGN KEY (`emsFdIncidentId`) REFERENCES `EmsFdIncident`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssignedUnit` ADD CONSTRAINT `AssignedUnit_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `Officer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssignedUnit` ADD CONSTRAINT `AssignedUnit_emsFdDeputyId_fkey` FOREIGN KEY (`emsFdDeputyId`) REFERENCES `EmsFdDeputy`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssignedUnit` ADD CONSTRAINT `AssignedUnit_combinedLeoId_fkey` FOREIGN KEY (`combinedLeoId`) REFERENCES `CombinedLeoUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssignedUnit` ADD CONSTRAINT `AssignedUnit_combinedEmsFdId_fkey` FOREIGN KEY (`combinedEmsFdId`) REFERENCES `CombinedEmsFdUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssignedUnit` ADD CONSTRAINT `AssignedUnit_call911Id_fkey` FOREIGN KEY (`call911Id`) REFERENCES `Call911`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssignedWarrantOfficer` ADD CONSTRAINT `AssignedWarrantOfficer_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `Officer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssignedWarrantOfficer` ADD CONSTRAINT `AssignedWarrantOfficer_combinedLeoId_fkey` FOREIGN KEY (`combinedLeoId`) REFERENCES `CombinedLeoUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssignedWarrantOfficer` ADD CONSTRAINT `AssignedWarrantOfficer_warrantId_fkey` FOREIGN KEY (`warrantId`) REFERENCES `Warrant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IncidentInvolvedUnit` ADD CONSTRAINT `IncidentInvolvedUnit_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `Officer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IncidentInvolvedUnit` ADD CONSTRAINT `IncidentInvolvedUnit_emsFdDeputyId_fkey` FOREIGN KEY (`emsFdDeputyId`) REFERENCES `EmsFdDeputy`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IncidentInvolvedUnit` ADD CONSTRAINT `IncidentInvolvedUnit_combinedLeoId_fkey` FOREIGN KEY (`combinedLeoId`) REFERENCES `CombinedLeoUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IncidentInvolvedUnit` ADD CONSTRAINT `IncidentInvolvedUnit_combinedEmsFdId_fkey` FOREIGN KEY (`combinedEmsFdId`) REFERENCES `CombinedEmsFdUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IncidentInvolvedUnit` ADD CONSTRAINT `IncidentInvolvedUnit_incidentId_fkey` FOREIGN KEY (`incidentId`) REFERENCES `LeoIncident`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IncidentInvolvedUnit` ADD CONSTRAINT `IncidentInvolvedUnit_emsFdIncidentId_fkey` FOREIGN KEY (`emsFdIncidentId`) REFERENCES `EmsFdIncident`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Call911Event` ADD CONSTRAINT `Call911Event_call911Id_fkey` FOREIGN KEY (`call911Id`) REFERENCES `Call911`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bolo` ADD CONSTRAINT `Bolo_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `Officer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Record` ADD CONSTRAINT `Record_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Record` ADD CONSTRAINT `Record_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `Officer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Record` ADD CONSTRAINT `Record_releaseId_fkey` FOREIGN KEY (`releaseId`) REFERENCES `RecordRelease`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Record` ADD CONSTRAINT `Record_CourtEntryId_fkey` FOREIGN KEY (`CourtEntryId`) REFERENCES `CourtEntry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Record` ADD CONSTRAINT `Record_expungementRequestId_fkey` FOREIGN KEY (`expungementRequestId`) REFERENCES `ExpungementRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Record` ADD CONSTRAINT `Record_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `RegisteredVehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Record` ADD CONSTRAINT `Record_call911Id_fkey` FOREIGN KEY (`call911Id`) REFERENCES `Call911`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Record` ADD CONSTRAINT `Record_incidentId_fkey` FOREIGN KEY (`incidentId`) REFERENCES `LeoIncident`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Record` ADD CONSTRAINT `Record_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Record` ADD CONSTRAINT `Record_emsFdIncidentId_fkey` FOREIGN KEY (`emsFdIncidentId`) REFERENCES `EmsFdIncident`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecordRelease` ADD CONSTRAINT `RecordRelease_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Warrant` ADD CONSTRAINT `Warrant_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Warrant` ADD CONSTRAINT `Warrant_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `Officer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Warrant` ADD CONSTRAINT `Warrant_expungementRequestId_fkey` FOREIGN KEY (`expungementRequestId`) REFERENCES `ExpungementRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecordLog` ADD CONSTRAINT `RecordLog_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecordLog` ADD CONSTRAINT `RecordLog_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecordLog` ADD CONSTRAINT `RecordLog_recordId_fkey` FOREIGN KEY (`recordId`) REFERENCES `Record`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecordLog` ADD CONSTRAINT `RecordLog_warrantId_fkey` FOREIGN KEY (`warrantId`) REFERENCES `Warrant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpungementRequest` ADD CONSTRAINT `ExpungementRequest_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpungementRequest` ADD CONSTRAINT `ExpungementRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NameChangeRequest` ADD CONSTRAINT `NameChangeRequest_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NameChangeRequest` ADD CONSTRAINT `NameChangeRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourtDate` ADD CONSTRAINT `CourtDate_courtEntryId_fkey` FOREIGN KEY (`courtEntryId`) REFERENCES `CourtEntry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmsFdDeputy` ADD CONSTRAINT `EmsFdDeputy_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `DepartmentValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmsFdDeputy` ADD CONSTRAINT `EmsFdDeputy_divisionId_fkey` FOREIGN KEY (`divisionId`) REFERENCES `DivisionValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmsFdDeputy` ADD CONSTRAINT `EmsFdDeputy_rankId_fkey` FOREIGN KEY (`rankId`) REFERENCES `Value`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmsFdDeputy` ADD CONSTRAINT `EmsFdDeputy_statusId_fkey` FOREIGN KEY (`statusId`) REFERENCES `StatusValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmsFdDeputy` ADD CONSTRAINT `EmsFdDeputy_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmsFdDeputy` ADD CONSTRAINT `EmsFdDeputy_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmsFdDeputy` ADD CONSTRAINT `EmsFdDeputy_activeCallId_fkey` FOREIGN KEY (`activeCallId`) REFERENCES `Call911`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmsFdDeputy` ADD CONSTRAINT `EmsFdDeputy_activeIncidentId_fkey` FOREIGN KEY (`activeIncidentId`) REFERENCES `LeoIncident`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmsFdDeputy` ADD CONSTRAINT `EmsFdDeputy_whitelistStatusId_fkey` FOREIGN KEY (`whitelistStatusId`) REFERENCES `LeoWhitelistStatus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmsFdDeputy` ADD CONSTRAINT `EmsFdDeputy_activeVehicleId_fkey` FOREIGN KEY (`activeVehicleId`) REFERENCES `EmergencyVehicleValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmsFdDeputy` ADD CONSTRAINT `EmsFdDeputy_combinedEmsFdUnitId_fkey` FOREIGN KEY (`combinedEmsFdUnitId`) REFERENCES `CombinedEmsFdUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmsFdIncident` ADD CONSTRAINT `EmsFdIncident_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `EmsFdDeputy`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmsFdIncident` ADD CONSTRAINT `EmsFdIncident_situationCodeId_fkey` FOREIGN KEY (`situationCodeId`) REFERENCES `StatusValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TruckLog` ADD CONSTRAINT `TruckLog_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TruckLog` ADD CONSTRAINT `TruckLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TruckLog` ADD CONSTRAINT `TruckLog_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `RegisteredVehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LicenseExam` ADD CONSTRAINT `LicenseExam_citizenId_fkey` FOREIGN KEY (`citizenId`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LicenseExam` ADD CONSTRAINT `LicenseExam_licenseId_fkey` FOREIGN KEY (`licenseId`) REFERENCES `Value`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomFieldValue` ADD CONSTRAINT `CustomFieldValue_fieldId_fkey` FOREIGN KEY (`fieldId`) REFERENCES `CustomField`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomRole` ADD CONSTRAINT `CustomRole_discordRoleId_fkey` FOREIGN KEY (`discordRoleId`) REFERENCES `DiscordRole`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourthousePost` ADD CONSTRAINT `CourthousePost_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActiveTone` ADD CONSTRAINT `ActiveTone_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TonePreset` ADD CONSTRAINT `TonePreset_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `DepartmentValue`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_leoRoles` ADD CONSTRAINT `_leoRoles_A_fkey` FOREIGN KEY (`A`) REFERENCES `DiscordRole`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_leoRoles` ADD CONSTRAINT `_leoRoles_B_fkey` FOREIGN KEY (`B`) REFERENCES `DiscordRoles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_emsFdRoles` ADD CONSTRAINT `_emsFdRoles_A_fkey` FOREIGN KEY (`A`) REFERENCES `DiscordRole`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_emsFdRoles` ADD CONSTRAINT `_emsFdRoles_B_fkey` FOREIGN KEY (`B`) REFERENCES `DiscordRoles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_dispatchRoles` ADD CONSTRAINT `_dispatchRoles_A_fkey` FOREIGN KEY (`A`) REFERENCES `DiscordRole`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_dispatchRoles` ADD CONSTRAINT `_dispatchRoles_B_fkey` FOREIGN KEY (`B`) REFERENCES `DiscordRoles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_leoSupervisorRoles` ADD CONSTRAINT `_leoSupervisorRoles_A_fkey` FOREIGN KEY (`A`) REFERENCES `DiscordRole`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_leoSupervisorRoles` ADD CONSTRAINT `_leoSupervisorRoles_B_fkey` FOREIGN KEY (`B`) REFERENCES `DiscordRoles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_taxiRoles` ADD CONSTRAINT `_taxiRoles_A_fkey` FOREIGN KEY (`A`) REFERENCES `DiscordRole`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_taxiRoles` ADD CONSTRAINT `_taxiRoles_B_fkey` FOREIGN KEY (`B`) REFERENCES `DiscordRoles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_towRoles` ADD CONSTRAINT `_towRoles_A_fkey` FOREIGN KEY (`A`) REFERENCES `DiscordRole`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_towRoles` ADD CONSTRAINT `_towRoles_B_fkey` FOREIGN KEY (`B`) REFERENCES `DiscordRoles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_courthouseRoles` ADD CONSTRAINT `_courthouseRoles_A_fkey` FOREIGN KEY (`A`) REFERENCES `DiscordRole`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_courthouseRoles` ADD CONSTRAINT `_courthouseRoles_B_fkey` FOREIGN KEY (`B`) REFERENCES `DiscordRoles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_adminRoles` ADD CONSTRAINT `_adminRoles_A_fkey` FOREIGN KEY (`A`) REFERENCES `DiscordRole`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_adminRoles` ADD CONSTRAINT `_adminRoles_B_fkey` FOREIGN KEY (`B`) REFERENCES `DiscordRoles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_dlCategoryToDLCategory` ADD CONSTRAINT `_dlCategoryToDLCategory_A_fkey` FOREIGN KEY (`A`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_dlCategoryToDLCategory` ADD CONSTRAINT `_dlCategoryToDLCategory_B_fkey` FOREIGN KEY (`B`) REFERENCES `DriversLicenseCategoryValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_citizenFlags` ADD CONSTRAINT `_citizenFlags_A_fkey` FOREIGN KEY (`A`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_citizenFlags` ADD CONSTRAINT `_citizenFlags_B_fkey` FOREIGN KEY (`B`) REFERENCES `Value`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_citizenAddressFlags` ADD CONSTRAINT `_citizenAddressFlags_A_fkey` FOREIGN KEY (`A`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_citizenAddressFlags` ADD CONSTRAINT `_citizenAddressFlags_B_fkey` FOREIGN KEY (`B`) REFERENCES `Value`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CitizenToCustomFieldValue` ADD CONSTRAINT `_CitizenToCustomFieldValue_A_fkey` FOREIGN KEY (`A`) REFERENCES `Citizen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CitizenToCustomFieldValue` ADD CONSTRAINT `_CitizenToCustomFieldValue_B_fkey` FOREIGN KEY (`B`) REFERENCES `CustomFieldValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_vehicleFlags` ADD CONSTRAINT `_vehicleFlags_A_fkey` FOREIGN KEY (`A`) REFERENCES `RegisteredVehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_vehicleFlags` ADD CONSTRAINT `_vehicleFlags_B_fkey` FOREIGN KEY (`B`) REFERENCES `Value`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_registeredVehicleTrimLevels` ADD CONSTRAINT `_registeredVehicleTrimLevels_A_fkey` FOREIGN KEY (`A`) REFERENCES `RegisteredVehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_registeredVehicleTrimLevels` ADD CONSTRAINT `_registeredVehicleTrimLevels_B_fkey` FOREIGN KEY (`B`) REFERENCES `Value`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_vehicleTrimLevels` ADD CONSTRAINT `_vehicleTrimLevels_A_fkey` FOREIGN KEY (`A`) REFERENCES `Value`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_vehicleTrimLevels` ADD CONSTRAINT `_vehicleTrimLevels_B_fkey` FOREIGN KEY (`B`) REFERENCES `VehicleValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_weaponFlags` ADD CONSTRAINT `_weaponFlags_A_fkey` FOREIGN KEY (`A`) REFERENCES `Value`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_weaponFlags` ADD CONSTRAINT `_weaponFlags_B_fkey` FOREIGN KEY (`B`) REFERENCES `Weapon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_officerDivisionsToDivision` ADD CONSTRAINT `_officerDivisionsToDivision_A_fkey` FOREIGN KEY (`A`) REFERENCES `DivisionValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_officerDivisionsToDivision` ADD CONSTRAINT `_officerDivisionsToDivision_B_fkey` FOREIGN KEY (`B`) REFERENCES `Officer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DivisionValueToEmergencyVehicleValue` ADD CONSTRAINT `_DivisionValueToEmergencyVehicleValue_A_fkey` FOREIGN KEY (`A`) REFERENCES `DivisionValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DivisionValueToEmergencyVehicleValue` ADD CONSTRAINT `_DivisionValueToEmergencyVehicleValue_B_fkey` FOREIGN KEY (`B`) REFERENCES `EmergencyVehicleValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DepartmentValueToQualificationValue` ADD CONSTRAINT `_DepartmentValueToQualificationValue_A_fkey` FOREIGN KEY (`A`) REFERENCES `DepartmentValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DepartmentValueToQualificationValue` ADD CONSTRAINT `_DepartmentValueToQualificationValue_B_fkey` FOREIGN KEY (`B`) REFERENCES `QualificationValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_officerRankDepartments` ADD CONSTRAINT `_officerRankDepartments_A_fkey` FOREIGN KEY (`A`) REFERENCES `DepartmentValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_officerRankDepartments` ADD CONSTRAINT `_officerRankDepartments_B_fkey` FOREIGN KEY (`B`) REFERENCES `Value`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DepartmentValueToEmergencyVehicleValue` ADD CONSTRAINT `_DepartmentValueToEmergencyVehicleValue_A_fkey` FOREIGN KEY (`A`) REFERENCES `DepartmentValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DepartmentValueToEmergencyVehicleValue` ADD CONSTRAINT `_DepartmentValueToEmergencyVehicleValue_B_fkey` FOREIGN KEY (`B`) REFERENCES `EmergencyVehicleValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_dlCategoryToLicenseExam` ADD CONSTRAINT `_dlCategoryToLicenseExam_A_fkey` FOREIGN KEY (`A`) REFERENCES `DriversLicenseCategoryValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_dlCategoryToLicenseExam` ADD CONSTRAINT `_dlCategoryToLicenseExam_B_fkey` FOREIGN KEY (`B`) REFERENCES `LicenseExam`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_registeredBusinessVehicles` ADD CONSTRAINT `_registeredBusinessVehicles_A_fkey` FOREIGN KEY (`A`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_registeredBusinessVehicles` ADD CONSTRAINT `_registeredBusinessVehicles_B_fkey` FOREIGN KEY (`B`) REFERENCES `RegisteredVehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_businessValueBusinessRoles` ADD CONSTRAINT `_businessValueBusinessRoles_A_fkey` FOREIGN KEY (`A`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_businessValueBusinessRoles` ADD CONSTRAINT `_businessValueBusinessRoles_B_fkey` FOREIGN KEY (`B`) REFERENCES `EmployeeValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_involvedOfficers` ADD CONSTRAINT `_involvedOfficers_A_fkey` FOREIGN KEY (`A`) REFERENCES `LeoIncident`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_involvedOfficers` ADD CONSTRAINT `_involvedOfficers_B_fkey` FOREIGN KEY (`B`) REFERENCES `Officer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_Call911ToDivisionValue` ADD CONSTRAINT `_Call911ToDivisionValue_A_fkey` FOREIGN KEY (`A`) REFERENCES `Call911`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_Call911ToDivisionValue` ADD CONSTRAINT `_Call911ToDivisionValue_B_fkey` FOREIGN KEY (`B`) REFERENCES `DivisionValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_Call911ToDepartmentValue` ADD CONSTRAINT `_Call911ToDepartmentValue_A_fkey` FOREIGN KEY (`A`) REFERENCES `Call911`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_Call911ToDepartmentValue` ADD CONSTRAINT `_Call911ToDepartmentValue_B_fkey` FOREIGN KEY (`B`) REFERENCES `DepartmentValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_Call911ToLeoIncident` ADD CONSTRAINT `_Call911ToLeoIncident_A_fkey` FOREIGN KEY (`A`) REFERENCES `Call911`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_Call911ToLeoIncident` ADD CONSTRAINT `_Call911ToLeoIncident_B_fkey` FOREIGN KEY (`B`) REFERENCES `LeoIncident`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_RecordToViolation` ADD CONSTRAINT `_RecordToViolation_A_fkey` FOREIGN KEY (`A`) REFERENCES `Record`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_RecordToViolation` ADD CONSTRAINT `_RecordToViolation_B_fkey` FOREIGN KEY (`B`) REFERENCES `Violation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CustomFieldValueToRegisteredVehicle` ADD CONSTRAINT `_CustomFieldValueToRegisteredVehicle_A_fkey` FOREIGN KEY (`A`) REFERENCES `CustomFieldValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CustomFieldValueToRegisteredVehicle` ADD CONSTRAINT `_CustomFieldValueToRegisteredVehicle_B_fkey` FOREIGN KEY (`B`) REFERENCES `RegisteredVehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CustomFieldValueToWeapon` ADD CONSTRAINT `_CustomFieldValueToWeapon_A_fkey` FOREIGN KEY (`A`) REFERENCES `CustomFieldValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CustomFieldValueToWeapon` ADD CONSTRAINT `_CustomFieldValueToWeapon_B_fkey` FOREIGN KEY (`B`) REFERENCES `Weapon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CustomRoleToUser` ADD CONSTRAINT `_CustomRoleToUser_A_fkey` FOREIGN KEY (`A`) REFERENCES `CustomRole`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CustomRoleToUser` ADD CONSTRAINT `_CustomRoleToUser_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

