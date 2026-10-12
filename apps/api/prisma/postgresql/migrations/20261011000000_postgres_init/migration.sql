-- CreateEnum
CREATE TYPE "DrugTestResult" AS ENUM ('POSITIVE', 'NEGATIVE', 'INCONCLUSIVE');

-- CreateEnum
CREATE TYPE "EmsFdReportType" AS ENUM ('MEDICAL', 'FIRE', 'FIRE_INVESTIGATION', 'INSPECTION');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "RadioTransport" AS ENUM ('BUILTIN', 'LIVEKIT');

-- CreateEnum
CREATE TYPE "ActiveToneType" AS ENUM ('LEO', 'EMS_FD', 'SHARED');

-- CreateEnum
CREATE TYPE "LicenseExamType" AS ENUM ('DRIVER', 'FIREARM', 'WATER', 'PILOT', 'HUNTING', 'FISHING');

-- CreateEnum
CREATE TYPE "QualificationValueType" AS ENUM ('QUALIFICATION', 'AWARD');

-- CreateEnum
CREATE TYPE "CustomFieldCategory" AS ENUM ('CITIZEN', 'WEAPON', 'VEHICLE');

-- CreateEnum
CREATE TYPE "DLExamPassType" AS ENUM ('PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "DLExamStatus" AS ENUM ('IN_PROGRESS', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "StatusViewMode" AS ENUM ('FULL_ROW_COLOR', 'DOT_COLOR');

-- CreateEnum
CREATE TYPE "TableActionsAlignment" AS ENUM ('NONE', 'LEFT', 'RIGHT');

-- CreateEnum
CREATE TYPE "Rank" AS ENUM ('OWNER', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "WhitelistStatus" AS ENUM ('ACCEPTED', 'PENDING', 'DECLINED');

-- CreateEnum
CREATE TYPE "ValueLicenseType" AS ENUM ('LICENSE', 'REGISTRATION_STATUS', 'INSURANCE_STATUS');

-- CreateEnum
CREATE TYPE "DepartmentType" AS ENUM ('LEO', 'EMS_FD');

-- CreateEnum
CREATE TYPE "ValueType" AS ENUM ('LICENSE', 'GENDER', 'ETHNICITY', 'VEHICLE', 'WEAPON', 'BLOOD_GROUP', 'BUSINESS_ROLE', 'CODES_10', 'PENAL_CODE', 'DEPARTMENT', 'OFFICER_RANK', 'DIVISION', 'DRIVERSLICENSE_CATEGORY', 'IMPOUND_LOT', 'VEHICLE_FLAG', 'CITIZEN_FLAG', 'QUALIFICATION', 'CALL_TYPE', 'ADDRESS', 'EMERGENCY_VEHICLE', 'ADDRESS_FLAG', 'VEHICLE_TRIM_LEVEL', 'WEAPON_FLAG');

-- CreateEnum
CREATE TYPE "DriversLicenseCategoryType" AS ENUM ('AUTOMOTIVE', 'AVIATION', 'WATER', 'FIREARM', 'HUNTING', 'FISHING', 'OTHER');

-- CreateEnum
CREATE TYPE "EmployeeAsEnum" AS ENUM ('OWNER', 'MANAGER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "StatusValueType" AS ENUM ('STATUS_CODE', 'SITUATION_CODE');

-- CreateEnum
CREATE TYPE "WhatPages" AS ENUM ('DISPATCH', 'EMS_FD', 'LEO');

-- CreateEnum
CREATE TYPE "ShouldDoType" AS ENUM ('SET_OFF_DUTY', 'SET_ON_DUTY', 'SET_ASSIGNED', 'SET_STATUS', 'PANIC_BUTTON', 'EN_ROUTE', 'ON_SCENE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "BoloType" AS ENUM ('VEHICLE', 'PERSON', 'OTHER');

-- CreateEnum
CREATE TYPE "ReleaseType" AS ENUM ('TIME_OUT', 'BAIL_POSTED');

-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('ARREST_REPORT', 'TICKET', 'WRITTEN_WARNING');

-- CreateEnum
CREATE TYPE "WarrantStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ExpungementRequestStatus" AS ENUM ('ACCEPTED', 'DENIED', 'PENDING', 'CANCELED');

-- CreateEnum
CREATE TYPE "VehicleInspectionStatus" AS ENUM ('PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "VehicleTaxStatus" AS ENUM ('TAXED', 'UNTAXED');

-- CreateEnum
CREATE TYPE "DiscordWebhookType" AS ENUM ('CALL_911', 'PANIC_BUTTON', 'UNIT_STATUS', 'BOLO', 'CITIZEN_RECORD', 'VEHICLE_IMPOUNDED', 'WARRANTS', 'BLEETER_POST', 'CITIZEN_DECLARED_DEAD', 'DEPARTMENT_WHITELIST_STATUS', 'USER_WHITELIST_STATUS', 'LEO_INCIDENT_CREATED', 'EMS_FD_INCIDENT_CREATED', 'USER_REGISTERED', 'USER_BAN_STATUS', 'BOLO_UPDATED', 'BOLO_DELETED', 'WARRANT_STATUS_CHANGED', 'CALL_911_ENDED', 'CITIZEN_CREATED', 'CITIZEN_DELETED', 'EXPUNGEMENT_REQUEST_STATUS', 'TOW_CALL_CREATED', 'TAXI_CALL_CREATED');

-- CreateEnum
CREATE TYPE "JailTimeScale" AS ENUM ('HOURS', 'MINUTES', 'SECONDS');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'UNPAID');

-- CreateEnum
CREATE TYPE "ToAddDefaultPermissionsKey" AS ENUM ('MANAGE_WARRANTS_PERMISSIONS', 'MANAGE_AWARDS_AND_QUALIFICATIONS');

-- CreateEnum
CREATE TYPE "PenalCodeType" AS ENUM ('INFRACTION', 'MISDEMEANOR', 'FELONY');

-- CreateEnum
CREATE TYPE "Feature" AS ENUM ('BLEETER', 'TOW', 'TAXI', 'COURTHOUSE', 'TRUCK_LOGS', 'AOP', 'BUSINESS', 'ALLOW_DUPLICATE_CITIZEN_NAMES', 'DISCORD_AUTH', 'CALLS_911', 'WEAPON_REGISTRATION', 'SOCIAL_SECURITY_NUMBERS', 'CUSTOM_TEXTFIELD_VALUES', 'DISALLOW_TEXTFIELD_SELECTION', 'ACTIVE_DISPATCHERS', 'ACTIVE_INCIDENTS', 'ALLOW_CITIZEN_UPDATE_LICENSE', 'ALLOW_REGULAR_LOGIN', 'RADIO_CHANNEL_MANAGEMENT', 'ALLOW_CITIZEN_DELETION_BY_NON_ADMIN', 'DL_EXAMS', 'DMV', 'BADGE_NUMBERS', 'USER_API_TOKENS', 'CITIZEN_RECORD_APPROVAL', 'COMMON_CITIZEN_CARDS', 'STEAM_OAUTH', 'CREATE_USER_CITIZEN_LEO', 'LEO_TICKETS', 'LEO_BAIL', 'COURTHOUSE_POSTS', 'WEAPON_EXAMS', 'ACTIVE_WARRANTS', 'CITIZEN_DELETE_ON_DEAD', 'PANIC_BUTTON', 'WARRANT_STATUS_APPROVAL', 'DIVISIONS', 'TONES', 'LICENSE_EXAMS', 'CITIZEN_CREATION_RECORDS', 'BUREAU_OF_FIREARMS', 'CALL_911_APPROVAL', 'FORCE_DISCORD_AUTH', 'FORCE_STEAM_AUTH', 'EDITABLE_SSN', 'EDITABLE_VIN', 'SIGNAL_100_CITIZEN', 'FORCE_ACCOUNT_PASSWORD', 'USER_DEFINED_CALLSIGN_COMBINED_UNIT', 'HOSPITAL_SERVICES', 'MEDICAL_RECORDS_CITIZEN_MANAGEABLE', 'PETS', 'REQUIRED_CITIZEN_IMAGE', 'LEO_EDITABLE_CITIZEN_PROFILE', 'ALLOW_MULTIPLE_UNITS_DEPARTMENTS_PER_USER', 'OPEN_LAW_BOOK', 'CITIZEN_RECORD_PAYMENTS', 'MODERN_CITIZEN_THEME', 'API_TOKEN_REMINDER', 'UNIT_PRIVATE_MESSAGES', 'RADIO');

-- CreateEnum
CREATE TYPE "DashboardLayoutCardType" AS ENUM ('ACTIVE_CALLS', 'ACTIVE_BOLOS', 'ACTIVE_WARRANTS', 'ACTIVE_OFFICERS', 'ACTIVE_DEPUTIES', 'ACTIVE_INCIDENTS');

-- CreateEnum
CREATE TYPE "VehiclePaceType" AS ENUM ('PACE', 'RADAR', 'LASER', 'OTHER');

-- CreateTable
CREATE TABLE "cad" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "areaOfPlay" VARCHAR(255),
    "steamApiKey" VARCHAR(255),
    "whitelisted" BOOLEAN NOT NULL DEFAULT false,
    "towWhitelisted" BOOLEAN NOT NULL DEFAULT false,
    "taxiWhitelisted" BOOLEAN NOT NULL DEFAULT false,
    "businessWhitelisted" BOOLEAN NOT NULL DEFAULT false,
    "logoId" TEXT,
    "registrationCode" TEXT,
    "miscCadSettingsId" TEXT,
    "apiTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autoSetUserPropertiesId" TEXT,
    "discordRolesId" TEXT,
    "timeZone" VARCHAR(255) DEFAULT 'UTC',

    CONSTRAINT "cad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadFeature" (
    "id" TEXT NOT NULL,
    "feature" "Feature" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cadId" TEXT,
    "extraFields" JSONB,

    CONSTRAINT "CadFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiscCadSettings" (
    "id" TEXT NOT NULL,
    "cadOGDescription" TEXT,
    "loginNotice" TEXT,
    "heightPrefix" VARCHAR(255) NOT NULL DEFAULT 'cm',
    "weightPrefix" VARCHAR(255) NOT NULL DEFAULT 'kg',
    "maxCitizensPerUser" INTEGER,
    "maxOfficersPerUser" INTEGER,
    "maxPlateLength" INTEGER NOT NULL DEFAULT 8,
    "maxBusinessesPerCitizen" INTEGER,
    "maxDivisionsPerOfficer" INTEGER,
    "maxDepartmentsEachPerUser" INTEGER,
    "maxAssignmentsToIncidents" INTEGER,
    "maxAssignmentsToCalls" INTEGER,
    "callsignTemplate" VARCHAR(255) NOT NULL DEFAULT '{department}{callsign1} - {callsign2}{division}',
    "caseNumberTemplate" TEXT,
    "pairedUnitTemplate" VARCHAR(255) DEFAULT '1A-{callsign1}',
    "pairedUnitSymbol" VARCHAR(255) DEFAULT 'A',
    "signal100Enabled" BOOLEAN NOT NULL DEFAULT false,
    "liveMapURL" TEXT,
    "roleplayEnabled" BOOLEAN DEFAULT true,
    "authScreenBgImageId" TEXT,
    "authScreenHeaderImageId" TEXT,
    "jailTimeScale" "JailTimeScale",
    "signal100RepeatAmount" INTEGER DEFAULT 1,
    "signal100RepeatIntervalMs" INTEGER DEFAULT 1000,
    "call911InactivityTimeout" INTEGER,
    "incidentInactivityTimeout" INTEGER,
    "unitInactivityTimeout" INTEGER,
    "boloInactivityTimeout" INTEGER,
    "activeWarrantsInactivityTimeout" INTEGER,
    "activeDispatchersInactivityTimeout" INTEGER,
    "driversLicenseNumberLength" INTEGER DEFAULT 8,
    "driversLicenseTemplate" TEXT,
    "pilotLicenseNumberLength" INTEGER DEFAULT 6,
    "pilotLicenseTemplate" TEXT,
    "weaponLicenseNumberLength" INTEGER DEFAULT 8,
    "weaponLicenseTemplate" TEXT,
    "waterLicenseNumberLength" INTEGER DEFAULT 8,
    "waterLicenseTemplate" TEXT,
    "huntingLicenseNumberLength" INTEGER DEFAULT 8,
    "huntingLicenseTemplate" TEXT,
    "fishingLicenseNumberLength" INTEGER DEFAULT 8,
    "fishingLicenseTemplate" TEXT,
    "driversLicenseMaxPoints" INTEGER DEFAULT 12,
    "pilotLicenseMaxPoints" INTEGER DEFAULT 12,
    "weaponLicenseMaxPoints" INTEGER DEFAULT 12,
    "waterLicenseMaxPoints" INTEGER DEFAULT 12,
    "fishingLicenseMaxPoints" INTEGER DEFAULT 12,
    "huntingLicenseMaxPoints" INTEGER DEFAULT 12,
    "lastInactivitySyncTimestamp" TIMESTAMP(3),

    CONSTRAINT "MiscCadSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveMapURL" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "miscCadSettingsId" TEXT,

    CONSTRAINT "LiveMapURL_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawWebhook" (
    "id" TEXT NOT NULL,
    "type" "DiscordWebhookType" NOT NULL,
    "url" TEXT NOT NULL,
    "miscCadSettingsId" TEXT,

    CONSTRAINT "RawWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscordWebhook" (
    "id" TEXT NOT NULL,
    "type" "DiscordWebhookType" NOT NULL,
    "webhookId" TEXT,
    "channelId" TEXT NOT NULL,
    "extraMessage" TEXT,
    "miscCadSettingsId" TEXT,

    CONSTRAINT "DiscordWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoSetPropertiesUser" (
    "id" TEXT NOT NULL,
    "leo" BOOLEAN DEFAULT false,
    "dispatch" BOOLEAN DEFAULT false,
    "emsFd" BOOLEAN DEFAULT false,
    "defaultPermissions" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "AutoSetPropertiesUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiToken" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "token" TEXT,
    "routes" JSONB NOT NULL DEFAULT '[]',
    "uses" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiTokenLog" (
    "id" TEXT NOT NULL,
    "apiTokenId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusCode" TEXT,
    "route" TEXT,
    "method" TEXT,

    CONSTRAINT "ApiTokenLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscordRoles" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "whitelistedRoleId" TEXT,
    "adminRolePermissions" JSONB NOT NULL DEFAULT '[]',
    "leoRolePermissions" JSONB NOT NULL DEFAULT '[]',
    "leoSupervisorRolePermissions" JSONB NOT NULL DEFAULT '[]',
    "emsFdRolePermissions" JSONB NOT NULL DEFAULT '[]',
    "dispatchRolePermissions" JSONB NOT NULL DEFAULT '[]',
    "towRolePermissions" JSONB NOT NULL DEFAULT '[]',
    "taxiRolePermissions" JSONB NOT NULL DEFAULT '[]',
    "courthouseRolePermissions" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "DiscordRoles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscordRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "guildId" TEXT,
    "discordRolesId" TEXT NOT NULL,

    CONSTRAINT "DiscordRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlacklistedWord" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlacklistedWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "executorId" TEXT,
    "action" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "translationKey" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "password" TEXT NOT NULL,
    "rank" "Rank" NOT NULL DEFAULT 'USER',
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "avatarUrl" TEXT,
    "steamId" VARCHAR(255),
    "whitelistStatus" "WhitelistStatus" NOT NULL DEFAULT 'ACCEPTED',
    "isDarkTheme" BOOLEAN NOT NULL DEFAULT true,
    "tempPassword" TEXT,
    "statusViewMode" "StatusViewMode" NOT NULL DEFAULT 'DOT_COLOR',
    "tableActionsAlignment" "TableActionsAlignment" NOT NULL DEFAULT 'RIGHT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discordId" TEXT,
    "lastDiscordSyncTimestamp" TIMESTAMP(3),
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "soundSettingsId" TEXT,
    "apiTokenId" TEXT,
    "locale" TEXT,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "developerMode" BOOLEAN NOT NULL DEFAULT false,
    "dispatchLayoutOrder" JSONB NOT NULL DEFAULT '[]',
    "emsFdLayoutOrder" JSONB NOT NULL DEFAULT '[]',
    "officerLayoutOrder" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "refreshToken" VARCHAR(512) NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToAddDefaultPermissions" (
    "id" TEXT NOT NULL,
    "key" "ToAddDefaultPermissionsKey" NOT NULL,
    "userId" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToAddDefaultPermissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSoundSettings" (
    "id" TEXT NOT NULL,
    "speech" BOOLEAN NOT NULL DEFAULT true,
    "speechVoice" TEXT,
    "panicButton" BOOLEAN NOT NULL DEFAULT true,
    "signal100" BOOLEAN NOT NULL DEFAULT true,
    "addedToCall" BOOLEAN NOT NULL DEFAULT false,
    "stopRoleplay" BOOLEAN NOT NULL DEFAULT false,
    "statusUpdate" BOOLEAN NOT NULL DEFAULT false,
    "incomingCall" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserSoundSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User2FA" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "User2FA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Citizen" (
    "id" TEXT NOT NULL,
    "socialSecurityNumber" TEXT,
    "userId" TEXT,
    "name" VARCHAR(255) NOT NULL,
    "surname" VARCHAR(255) NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "genderId" TEXT,
    "ethnicityId" TEXT,
    "hairColor" VARCHAR(255) NOT NULL,
    "eyeColor" VARCHAR(255) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "postal" VARCHAR(255),
    "height" VARCHAR(255) NOT NULL,
    "weight" VARCHAR(255) NOT NULL,
    "driversLicenseId" TEXT,
    "driversLicenseNumber" TEXT,
    "weaponLicenseId" TEXT,
    "weaponLicenseNumber" TEXT,
    "pilotLicenseId" TEXT,
    "pilotLicenseNumber" TEXT,
    "waterLicenseId" TEXT,
    "waterLicenseNumber" TEXT,
    "huntingLicenseId" TEXT,
    "huntingLicenseNumber" TEXT,
    "fishingLicenseId" TEXT,
    "fishingLicenseNumber" TEXT,
    "ccwId" TEXT,
    "imageId" TEXT,
    "imageBlurData" TEXT,
    "note" TEXT,
    "dead" BOOLEAN DEFAULT false,
    "dateOfDead" TIMESTAMP(3),
    "missing" BOOLEAN DEFAULT false,
    "dateOfMissing" TIMESTAMP(3),
    "arrested" BOOLEAN DEFAULT false,
    "phoneNumber" TEXT,
    "occupation" TEXT,
    "additionalInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appearance" TEXT,
    "licensePointsId" TEXT,
    "suspendedLicensesId" TEXT,

    CONSTRAINT "Citizen_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "CitizenLicensePoints" (
    "id" TEXT NOT NULL,
    "driverLicensePoints" INTEGER NOT NULL DEFAULT 0,
    "pilotLicensePoints" INTEGER NOT NULL DEFAULT 0,
    "waterLicensePoints" INTEGER NOT NULL DEFAULT 0,
    "huntingLicensePoints" INTEGER NOT NULL DEFAULT 0,
    "fishingLicensePoints" INTEGER NOT NULL DEFAULT 0,
    "firearmsLicensePoints" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CitizenLicensePoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuspendedCitizenLicenses" (
    "id" TEXT NOT NULL,
    "driverLicense" BOOLEAN NOT NULL DEFAULT false,
    "driverLicenseTimeEnd" TIMESTAMP(3),
    "pilotLicense" BOOLEAN NOT NULL DEFAULT false,
    "pilotLicenseTimeEnd" TIMESTAMP(3),
    "waterLicense" BOOLEAN NOT NULL DEFAULT false,
    "waterLicenseTimeEnd" TIMESTAMP(3),
    "fishingLicense" BOOLEAN NOT NULL DEFAULT false,
    "fishingLicenseTimeEnd" TIMESTAMP(3),
    "huntingLicense" BOOLEAN NOT NULL DEFAULT false,
    "huntingLicenseTimeEnd" TIMESTAMP(3),
    "firearmsLicense" BOOLEAN NOT NULL DEFAULT false,
    "firearmsLicenseTimeEnd" TIMESTAMP(3),

    CONSTRAINT "SuspendedCitizenLicenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "breed" VARCHAR(255) NOT NULL,
    "color" VARCHAR(255) NOT NULL,
    "weight" VARCHAR(255) NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "citizenId" TEXT NOT NULL,
    "imageId" TEXT,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "citizenId" TEXT,
    "vehicleId" TEXT,
    "petId" TEXT,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegisteredVehicle" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "citizenId" TEXT,
    "vinNumber" VARCHAR(255) NOT NULL,
    "plate" VARCHAR(255) NOT NULL,
    "modelId" TEXT NOT NULL,
    "color" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registrationStatusId" TEXT NOT NULL,
    "insuranceStatusId" TEXT,
    "inspectionStatus" "VehicleInspectionStatus",
    "taxStatus" "VehicleTaxStatus",
    "reportedStolen" BOOLEAN NOT NULL DEFAULT false,
    "impounded" BOOLEAN NOT NULL DEFAULT false,
    "dmvStatus" "WhitelistStatus",
    "appearance" TEXT,
    "imageId" TEXT,

    CONSTRAINT "RegisteredVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Weapon" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "citizenId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serialNumber" VARCHAR(255) NOT NULL,
    "registrationStatusId" TEXT NOT NULL,
    "bofStatus" "WhitelistStatus",
    "modelId" TEXT NOT NULL,

    CONSTRAINT "Weapon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "citizenId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT,
    "description" TEXT,
    "descriptionData" JSONB,
    "bloodGroupId" TEXT,

    CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetMedicalRecord" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "petId" TEXT NOT NULL,
    "type" TEXT,
    "description" TEXT,

    CONSTRAINT "PetMedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorVisit" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "citizenId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diagnosis" TEXT,
    "description" TEXT,
    "conditions" TEXT,
    "medications" TEXT,

    CONSTRAINT "DoctorVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Value" (
    "id" TEXT NOT NULL,
    "type" "ValueType" NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "isDefault" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "position" INTEGER,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "licenseType" "ValueLicenseType",
    "officerRankImageId" TEXT,
    "officerRankImageBlurData" TEXT,

    CONSTRAINT "Value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddressValue" (
    "id" TEXT NOT NULL,
    "valueId" TEXT NOT NULL,
    "county" TEXT,
    "postal" TEXT,

    CONSTRAINT "AddressValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenalCode" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "descriptionData" JSONB,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "type" "PenalCodeType",
    "warningApplicableId" TEXT,
    "warningNotApplicableId" TEXT,
    "position" INTEGER,
    "groupId" TEXT,

    CONSTRAINT "PenalCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenalCodeGroup" (
    "id" TEXT NOT NULL,
    "position" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,

    CONSTRAINT "PenalCodeGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarningApplicable" (
    "id" TEXT NOT NULL,
    "fines" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "WarningApplicable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarningNotApplicable" (
    "id" TEXT NOT NULL,
    "fines" JSONB NOT NULL DEFAULT '[]',
    "prisonTerm" JSONB NOT NULL DEFAULT '[]',
    "bail" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "WarningNotApplicable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Violation" (
    "id" TEXT NOT NULL,
    "fine" INTEGER,
    "jailTime" INTEGER,
    "bail" INTEGER,
    "communityService" TEXT,
    "penalCodeId" TEXT,
    "counts" INTEGER,

    CONSTRAINT "Violation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeizedItem" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "illegal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SeizedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DivisionValue" (
    "id" TEXT NOT NULL,
    "valueId" TEXT NOT NULL,
    "departmentId" TEXT,
    "callsign" TEXT,
    "pairedUnitTemplate" VARCHAR(255),
    "extraFields" JSONB,

    CONSTRAINT "DivisionValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentValue" (
    "id" TEXT NOT NULL,
    "valueId" TEXT NOT NULL,
    "callsign" TEXT,
    "customTemplate" TEXT,
    "whitelisted" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultDepartment" BOOLEAN NOT NULL DEFAULT false,
    "type" "DepartmentType" NOT NULL DEFAULT 'LEO',
    "statusValueId" TEXT,
    "defaultOfficerRankId" TEXT,
    "isConfidential" BOOLEAN NOT NULL DEFAULT false,
    "extraFields" JSONB,

    CONSTRAINT "DepartmentValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentValueLink" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "DepartmentValueLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyVehicleValue" (
    "id" TEXT NOT NULL,
    "valueId" TEXT NOT NULL,
    "extraFields" JSONB,
    "description" TEXT,

    CONSTRAINT "EmergencyVehicleValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriversLicenseCategoryValue" (
    "id" TEXT NOT NULL,
    "valueId" TEXT NOT NULL,
    "type" "DriversLicenseCategoryType" NOT NULL,
    "description" TEXT,

    CONSTRAINT "DriversLicenseCategoryValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleValue" (
    "id" TEXT NOT NULL,
    "valueId" TEXT NOT NULL,
    "hash" TEXT,
    "imageId" TEXT,

    CONSTRAINT "VehicleValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeaponValue" (
    "id" TEXT NOT NULL,
    "valueId" TEXT NOT NULL,
    "hash" TEXT,

    CONSTRAINT "WeaponValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallTypeValue" (
    "id" TEXT NOT NULL,
    "priority" TEXT,
    "valueId" TEXT NOT NULL,
    "isDisposition" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CallTypeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "executorId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BleeterProfile" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "handle" VARCHAR(255) NOT NULL,
    "isVerified" BOOLEAN DEFAULT false,
    "bio" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BleeterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BleeterProfileFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followerProfileId" TEXT,
    "followingProfileId" TEXT,

    CONSTRAINT "BleeterProfileFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BleeterPost" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT,
    "bodyData" JSONB,
    "imageId" VARCHAR(255),
    "imageBlurData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BleeterPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TowCall" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "assignedUnitId" TEXT,
    "location" VARCHAR(255) NOT NULL,
    "postal" TEXT,
    "deliveryAddressId" TEXT,
    "plate" VARCHAR(255),
    "model" VARCHAR(255),
    "name" TEXT,
    "description" TEXT,
    "descriptionData" JSONB,
    "creatorId" TEXT,
    "ended" BOOLEAN NOT NULL DEFAULT false,
    "callCountyService" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TowCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxiCall" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "assignedUnitId" TEXT,
    "location" VARCHAR(255) NOT NULL,
    "postal" TEXT,
    "name" TEXT,
    "description" TEXT,
    "descriptionData" JSONB,
    "creatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxiCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(255) NOT NULL,
    "whitelisted" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT NOT NULL,
    "postal" VARCHAR(255),
    "status" "WhitelistStatus",

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "roleId" TEXT,
    "employeeOfTheMonth" BOOLEAN NOT NULL DEFAULT false,
    "canCreatePosts" BOOLEAN NOT NULL DEFAULT true,
    "canManageEmployees" BOOLEAN NOT NULL DEFAULT false,
    "canManageVehicles" BOOLEAN NOT NULL DEFAULT false,
    "whitelistStatus" "WhitelistStatus" NOT NULL DEFAULT 'ACCEPTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT,
    "bodyData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeValue" (
    "id" TEXT NOT NULL,
    "valueId" TEXT NOT NULL,
    "as" "EmployeeAsEnum" NOT NULL DEFAULT 'EMPLOYEE',

    CONSTRAINT "EmployeeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Officer" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT,
    "callsign" VARCHAR(255) NOT NULL,
    "callsign2" VARCHAR(255) NOT NULL,
    "activeDivisionCallsignId" TEXT,
    "incremental" INTEGER,
    "userDefinedCallsign" TEXT,
    "rankId" TEXT,
    "position" TEXT,
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
    "whitelistStatusId" TEXT,
    "radioChannelId" TEXT,
    "activeIncidentId" TEXT,
    "activeCallId" TEXT,
    "combinedLeoUnitId" TEXT,
    "activeVehicleId" TEXT,
    "isTemporary" BOOLEAN NOT NULL DEFAULT false,
    "identifiers" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Officer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndividualDivisionCallsign" (
    "id" TEXT NOT NULL,
    "divisionId" TEXT,
    "callsign" TEXT NOT NULL,
    "callsign2" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,

    CONSTRAINT "IndividualDivisionCallsign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitQualification" (
    "id" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "suspendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "officerId" TEXT,
    "emsFdDeputyId" TEXT,

    CONSTRAINT "UnitQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualificationValue" (
    "id" TEXT NOT NULL,
    "imageId" TEXT,
    "imageBlurData" TEXT,
    "valueId" TEXT NOT NULL,
    "departmentId" TEXT,
    "description" TEXT,
    "qualificationType" "QualificationValueType" NOT NULL DEFAULT 'QUALIFICATION',

    CONSTRAINT "QualificationValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeoWhitelistStatus" (
    "id" TEXT NOT NULL,
    "status" "WhitelistStatus" NOT NULL,
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "LeoWhitelistStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusValue" (
    "id" TEXT NOT NULL,
    "valueId" TEXT NOT NULL,
    "shouldDo" "ShouldDoType" NOT NULL DEFAULT 'SET_STATUS',
    "whatPages" JSONB NOT NULL DEFAULT '[]',
    "color" TEXT,
    "textColor" TEXT,
    "type" "StatusValueType" NOT NULL DEFAULT 'STATUS_CODE',

    CONSTRAINT "StatusValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficerLog" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "userId" TEXT,
    "officerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emsFdDeputyId" TEXT,

    CONSTRAINT "OfficerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpoundedVehicle" (
    "id" TEXT NOT NULL,
    "registeredVehicleId" TEXT NOT NULL,
    "valueId" TEXT NOT NULL,
    "officerId" TEXT,
    "descriptionData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImpoundedVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeoIncident" (
    "id" TEXT NOT NULL,
    "caseNumber" SERIAL NOT NULL,
    "description" TEXT,
    "descriptionData" JSONB,
    "postal" TEXT,
    "creatorId" TEXT,
    "firearmsInvolved" BOOLEAN NOT NULL DEFAULT false,
    "injuriesOrFatalities" BOOLEAN NOT NULL DEFAULT false,
    "arrestsMade" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "situationCodeId" TEXT,

    CONSTRAINT "LeoIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incidentId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emsFdIncidentId" TEXT,

    CONSTRAINT "IncidentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CombinedLeoUnit" (
    "id" TEXT NOT NULL,
    "userDefinedCallsign" TEXT,
    "callsign" TEXT NOT NULL,
    "callsign2" TEXT,
    "departmentId" TEXT,
    "incremental" INTEGER,
    "radioChannelId" TEXT,
    "statusId" TEXT,
    "pairedUnitTemplate" VARCHAR(255),
    "activeCallId" TEXT,
    "activeIncidentId" TEXT,
    "activeVehicleId" TEXT,
    "emsFdIncidentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CombinedLeoUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CombinedEmsFdUnit" (
    "id" TEXT NOT NULL,
    "callsign" TEXT NOT NULL,
    "userDefinedCallsign" TEXT,
    "callsign2" TEXT,
    "departmentId" TEXT,
    "incremental" INTEGER,
    "radioChannelId" TEXT,
    "statusId" TEXT,
    "pairedUnitTemplate" VARCHAR(255),
    "activeCallId" TEXT,
    "activeIncidentId" TEXT,
    "activeVehicleId" TEXT,
    "emsFdIncidentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CombinedEmsFdUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveDispatchers" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT,

    CONSTRAINT "ActiveDispatchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchChat" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "creatorId" TEXT,
    "callId" TEXT,
    "incidentId" TEXT,

    CONSTRAINT "DispatchChat_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "ChatCreator" (
    "id" TEXT NOT NULL,
    "officerId" TEXT,
    "emsFdDeputyId" TEXT,
    "combinedLeoId" TEXT,
    "combinedEmsFdId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatCreator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call911" (
    "id" TEXT NOT NULL,
    "caseNumber" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "positionId" TEXT,
    "userId" TEXT,
    "location" TEXT NOT NULL,
    "postal" TEXT,
    "description" TEXT,
    "descriptionData" JSONB,
    "name" VARCHAR(255) NOT NULL,
    "ended" BOOLEAN DEFAULT false,
    "situationCodeId" TEXT,
    "dispositionCodeId" TEXT,
    "viaDispatch" BOOLEAN DEFAULT false,
    "typeId" TEXT,
    "gtaMapPositionId" TEXT,
    "isSignal100" BOOLEAN DEFAULT false,
    "extraFields" JSONB,
    "status" "WhitelistStatus",
    "emsFdIncidentId" TEXT,

    CONSTRAINT "Call911_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GTAMapPosition" (
    "id" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL,
    "heading" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "GTAMapPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignedUnit" (
    "id" TEXT NOT NULL,
    "isPrimary" BOOLEAN DEFAULT false,
    "officerId" TEXT,
    "emsFdDeputyId" TEXT,
    "combinedLeoId" TEXT,
    "combinedEmsFdId" TEXT,
    "call911Id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignedUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignedWarrantOfficer" (
    "id" TEXT NOT NULL,
    "officerId" TEXT,
    "combinedLeoId" TEXT,
    "warrantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignedWarrantOfficer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentInvolvedUnit" (
    "id" TEXT NOT NULL,
    "officerId" TEXT,
    "emsFdDeputyId" TEXT,
    "combinedLeoId" TEXT,
    "combinedEmsFdId" TEXT,
    "incidentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emsFdIncidentId" TEXT,

    CONSTRAINT "IncidentInvolvedUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call911Event" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "call911Id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "translationData" JSONB,

    CONSTRAINT "Call911Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bolo" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "BoloType" NOT NULL,
    "description" TEXT,
    "plate" VARCHAR(255),
    "model" VARCHAR(255),
    "color" VARCHAR(255),
    "name" VARCHAR(255),
    "officerId" TEXT,

    CONSTRAINT "Bolo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Record" (
    "id" TEXT NOT NULL,
    "publishStatus" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "caseNumber" SERIAL NOT NULL,
    "type" "RecordType" NOT NULL,
    "citizenId" TEXT,
    "officerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postal" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "descriptionData" JSONB,
    "releaseId" TEXT,
    "CourtEntryId" TEXT,
    "expungementRequestId" TEXT,
    "status" "WhitelistStatus" DEFAULT 'ACCEPTED',
    "paymentStatus" "PaymentStatus",
    "vehicleId" TEXT,
    "vehiclePlate" TEXT,
    "vehicleModel" TEXT,
    "vehicleColor" TEXT,
    "vehicleSpeed" TEXT,
    "speedLimit" TEXT,
    "vehiclePaceType" "VehiclePaceType",
    "call911Id" TEXT,
    "incidentId" TEXT,
    "businessId" TEXT,
    "emsFdIncidentId" TEXT,

    CONSTRAINT "Record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordRelease" (
    "id" TEXT NOT NULL,
    "type" "ReleaseType" NOT NULL,
    "citizenId" TEXT,

    CONSTRAINT "RecordRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warrant" (
    "id" TEXT NOT NULL,
    "caseNumber" SERIAL NOT NULL,
    "citizenId" TEXT NOT NULL,
    "officerId" TEXT,
    "description" TEXT NOT NULL,
    "status" "WarrantStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expungementRequestId" TEXT,
    "approvalStatus" "WhitelistStatus" DEFAULT 'ACCEPTED',

    CONSTRAINT "Warrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordLog" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT,
    "businessId" TEXT,
    "recordId" TEXT,
    "warrantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpungementRequest" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "userId" TEXT,
    "status" "ExpungementRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,

    CONSTRAINT "ExpungementRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NameChangeRequest" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "userId" TEXT,
    "newName" TEXT NOT NULL,
    "newSurname" TEXT NOT NULL,
    "description" TEXT,
    "status" "WhitelistStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NameChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourtEntry" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "descriptionData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourtEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourtDate" (
    "id" TEXT NOT NULL,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "courtEntryId" TEXT NOT NULL,

    CONSTRAINT "CourtDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmsFdDeputy" (
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
    "identifiers" JSONB NOT NULL DEFAULT '[]',
    "combinedEmsFdUnitId" TEXT,

    CONSTRAINT "EmsFdDeputy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmsFdIncident" (
    "id" TEXT NOT NULL,
    "caseNumber" SERIAL NOT NULL,
    "description" TEXT,
    "descriptionData" JSONB,
    "address" TEXT,
    "postal" TEXT,
    "fireType" TEXT,
    "reportType" "EmsFdReportType" NOT NULL DEFAULT 'MEDICAL',
    "causeOfFire" TEXT,
    "propertyDamage" VARCHAR(255),
    "inspectionResult" VARCHAR(255),
    "creatorId" TEXT,
    "firearmsInvolved" BOOLEAN NOT NULL DEFAULT false,
    "injuriesOrFatalities" BOOLEAN NOT NULL DEFAULT false,
    "arrestsMade" BOOLEAN NOT NULL DEFAULT false,
    "vehicleInvolved" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "situationCodeId" TEXT,

    CONSTRAINT "EmsFdIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TruckLog" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "startedAt" VARCHAR(255) NOT NULL,
    "endedAt" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "TruckLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseExam" (
    "id" TEXT NOT NULL,
    "theoryExam" "DLExamPassType",
    "practiceExam" "DLExamPassType",
    "status" "DLExamStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "LicenseExamType" NOT NULL,
    "citizenId" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,

    CONSTRAINT "LicenseExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "citizenEditable" BOOLEAN NOT NULL DEFAULT false,
    "category" "CustomFieldCategory" NOT NULL,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldValue" (
    "id" TEXT NOT NULL,
    "value" TEXT,
    "fieldId" TEXT NOT NULL,

    CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconId" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discordRoleId" TEXT,

    CONSTRAINT "CustomRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourthousePost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "descriptionData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourthousePost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveTone" (
    "id" TEXT NOT NULL,
    "type" "ActiveToneType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "ActiveTone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TonePreset" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(255) NOT NULL,
    "sound" TEXT NOT NULL,
    "type" "ActiveToneType" NOT NULL DEFAULT 'SHARED',
    "departmentId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TonePreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadioChannel" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(255) NOT NULL,
    "frequency" VARCHAR(64),
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "allowExternal" BOOLEAN NOT NULL DEFAULT true,
    "receiveOnly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RadioChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadioSettings" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transport" "RadioTransport" NOT NULL DEFAULT 'BUILTIN',

    CONSTRAINT "RadioSettings_pkey" PRIMARY KEY ("id")
);

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

    CONSTRAINT "FivemFrameworkSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_leoRoles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_emsFdRoles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_dispatchRoles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_leoSupervisorRoles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_taxiRoles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_towRoles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_courthouseRoles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_adminRoles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_dlCategoryToDLCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_citizenFlags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_citizenAddressFlags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_CitizenToCustomFieldValue" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_vehicleFlags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_registeredVehicleTrimLevels" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_vehicleTrimLevels" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_weaponFlags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_officerDivisionsToDivision" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_DivisionValueToEmergencyVehicleValue" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_DepartmentValueToQualificationValue" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_officerRankDepartments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_DepartmentValueToEmergencyVehicleValue" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_radioChannelDepartments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_dlCategoryToLicenseExam" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_registeredBusinessVehicles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_businessValueBusinessRoles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_involvedOfficers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_Call911ToDivisionValue" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_Call911ToDepartmentValue" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_Call911ToLeoIncident" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_RecordToViolation" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_CustomFieldValueToRegisteredVehicle" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_CustomFieldValueToWeapon" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_CustomRoleToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CadFeature_feature_key" ON "CadFeature"("feature");

-- CreateIndex
CREATE UNIQUE INDEX "RawWebhook_type_key" ON "RawWebhook"("type");

-- CreateIndex
CREATE UNIQUE INDEX "DiscordWebhook_type_key" ON "DiscordWebhook"("type");

-- CreateIndex
CREATE UNIQUE INDEX "DiscordRole_id_key" ON "DiscordRole"("id");

-- CreateIndex
CREATE UNIQUE INDEX "BlacklistedWord_id_key" ON "BlacklistedWord"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_refreshToken_key" ON "UserSession"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "ToAddDefaultPermissions_key_userId_key" ON "ToAddDefaultPermissions"("key", "userId");

-- CreateIndex
CREATE INDEX "fullname" ON "Citizen"("name", "surname");

-- CreateIndex
CREATE INDEX "CitizenClaimRequest_citizenId_status_idx" ON "CitizenClaimRequest"("citizenId", "status");

-- CreateIndex
CREATE INDEX "CitizenClaimRequest_userId_status_idx" ON "CitizenClaimRequest"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RegisteredVehicle_vinNumber_key" ON "RegisteredVehicle"("vinNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RegisteredVehicle_plate_key" ON "RegisteredVehicle"("plate");

-- CreateIndex
CREATE INDEX "RegisteredVehicle_plate_vinNumber_idx" ON "RegisteredVehicle"("plate", "vinNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Weapon_serialNumber_key" ON "Weapon"("serialNumber");

-- CreateIndex
CREATE INDEX "Weapon_serialNumber_idx" ON "Weapon"("serialNumber");

-- CreateIndex
CREATE INDEX "Value_type_idx" ON "Value"("type");

-- CreateIndex
CREATE UNIQUE INDEX "BleeterProfile_handle_key" ON "BleeterProfile"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "BleeterProfile_userId_key" ON "BleeterProfile"("userId");

-- CreateIndex
CREATE INDEX "Officer_callsign_callsign2_statusId_idx" ON "Officer"("callsign", "callsign2", "statusId");

-- CreateIndex
CREATE UNIQUE INDEX "LeoIncident_caseNumber_key" ON "LeoIncident"("caseNumber");

-- CreateIndex
CREATE INDEX "CombinedLeoUnit_statusId_idx" ON "CombinedLeoUnit"("statusId");

-- CreateIndex
CREATE INDEX "CombinedEmsFdUnit_statusId_idx" ON "CombinedEmsFdUnit"("statusId");

-- CreateIndex
CREATE INDEX "UnitPrivateMessage_senderUnitId_recipientUnitId_idx" ON "UnitPrivateMessage"("senderUnitId", "recipientUnitId");

-- CreateIndex
CREATE INDEX "UnitPrivateMessage_recipientUnitId_readAt_idx" ON "UnitPrivateMessage"("recipientUnitId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "Call911_caseNumber_key" ON "Call911"("caseNumber");

-- CreateIndex
CREATE INDEX "Call911_caseNumber_idx" ON "Call911"("caseNumber");

-- CreateIndex
CREATE INDEX "Bolo_type_plate_name_idx" ON "Bolo"("type", "plate", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Record_caseNumber_key" ON "Record"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Warrant_caseNumber_key" ON "Warrant"("caseNumber");

-- CreateIndex
CREATE INDEX "EmsFdDeputy_callsign_callsign2_statusId_idx" ON "EmsFdDeputy"("callsign", "callsign2", "statusId");

-- CreateIndex
CREATE UNIQUE INDEX "EmsFdIncident_caseNumber_key" ON "EmsFdIncident"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CustomRole_name_key" ON "CustomRole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ActiveTone_type_key" ON "ActiveTone"("type");

-- CreateIndex
CREATE UNIQUE INDEX "OpsPhoneRequest_requestId_key" ON "OpsPhoneRequest"("requestId");

-- CreateIndex
CREATE INDEX "OpsPhoneRequest_call911Id_idx" ON "OpsPhoneRequest"("call911Id");

-- CreateIndex
CREATE INDEX "OpsPhoneRequest_towCallId_idx" ON "OpsPhoneRequest"("towCallId");

-- CreateIndex
CREATE INDEX "OpsPhoneRequest_taxiCallId_idx" ON "OpsPhoneRequest"("taxiCallId");

-- CreateIndex
CREATE INDEX "FivemCharacter_citizenId_idx" ON "FivemCharacter"("citizenId");

-- CreateIndex
CREATE UNIQUE INDEX "FivemCharacter_framework_characterId_key" ON "FivemCharacter"("framework", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "FivemVehicle_vehicleId_key" ON "FivemVehicle"("vehicleId");

-- CreateIndex
CREATE INDEX "FivemVehicle_framework_characterId_idx" ON "FivemVehicle"("framework", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "_leoRoles_AB_unique" ON "_leoRoles"("A", "B");

-- CreateIndex
CREATE INDEX "_leoRoles_B_index" ON "_leoRoles"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_emsFdRoles_AB_unique" ON "_emsFdRoles"("A", "B");

-- CreateIndex
CREATE INDEX "_emsFdRoles_B_index" ON "_emsFdRoles"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_dispatchRoles_AB_unique" ON "_dispatchRoles"("A", "B");

-- CreateIndex
CREATE INDEX "_dispatchRoles_B_index" ON "_dispatchRoles"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_leoSupervisorRoles_AB_unique" ON "_leoSupervisorRoles"("A", "B");

-- CreateIndex
CREATE INDEX "_leoSupervisorRoles_B_index" ON "_leoSupervisorRoles"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_taxiRoles_AB_unique" ON "_taxiRoles"("A", "B");

-- CreateIndex
CREATE INDEX "_taxiRoles_B_index" ON "_taxiRoles"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_towRoles_AB_unique" ON "_towRoles"("A", "B");

-- CreateIndex
CREATE INDEX "_towRoles_B_index" ON "_towRoles"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_courthouseRoles_AB_unique" ON "_courthouseRoles"("A", "B");

-- CreateIndex
CREATE INDEX "_courthouseRoles_B_index" ON "_courthouseRoles"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_adminRoles_AB_unique" ON "_adminRoles"("A", "B");

-- CreateIndex
CREATE INDEX "_adminRoles_B_index" ON "_adminRoles"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_dlCategoryToDLCategory_AB_unique" ON "_dlCategoryToDLCategory"("A", "B");

-- CreateIndex
CREATE INDEX "_dlCategoryToDLCategory_B_index" ON "_dlCategoryToDLCategory"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_citizenFlags_AB_unique" ON "_citizenFlags"("A", "B");

-- CreateIndex
CREATE INDEX "_citizenFlags_B_index" ON "_citizenFlags"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_citizenAddressFlags_AB_unique" ON "_citizenAddressFlags"("A", "B");

-- CreateIndex
CREATE INDEX "_citizenAddressFlags_B_index" ON "_citizenAddressFlags"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CitizenToCustomFieldValue_AB_unique" ON "_CitizenToCustomFieldValue"("A", "B");

-- CreateIndex
CREATE INDEX "_CitizenToCustomFieldValue_B_index" ON "_CitizenToCustomFieldValue"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_vehicleFlags_AB_unique" ON "_vehicleFlags"("A", "B");

-- CreateIndex
CREATE INDEX "_vehicleFlags_B_index" ON "_vehicleFlags"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_registeredVehicleTrimLevels_AB_unique" ON "_registeredVehicleTrimLevels"("A", "B");

-- CreateIndex
CREATE INDEX "_registeredVehicleTrimLevels_B_index" ON "_registeredVehicleTrimLevels"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_vehicleTrimLevels_AB_unique" ON "_vehicleTrimLevels"("A", "B");

-- CreateIndex
CREATE INDEX "_vehicleTrimLevels_B_index" ON "_vehicleTrimLevels"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_weaponFlags_AB_unique" ON "_weaponFlags"("A", "B");

-- CreateIndex
CREATE INDEX "_weaponFlags_B_index" ON "_weaponFlags"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_officerDivisionsToDivision_AB_unique" ON "_officerDivisionsToDivision"("A", "B");

-- CreateIndex
CREATE INDEX "_officerDivisionsToDivision_B_index" ON "_officerDivisionsToDivision"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_DivisionValueToEmergencyVehicleValue_AB_unique" ON "_DivisionValueToEmergencyVehicleValue"("A", "B");

-- CreateIndex
CREATE INDEX "_DivisionValueToEmergencyVehicleValue_B_index" ON "_DivisionValueToEmergencyVehicleValue"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_DepartmentValueToQualificationValue_AB_unique" ON "_DepartmentValueToQualificationValue"("A", "B");

-- CreateIndex
CREATE INDEX "_DepartmentValueToQualificationValue_B_index" ON "_DepartmentValueToQualificationValue"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_officerRankDepartments_AB_unique" ON "_officerRankDepartments"("A", "B");

-- CreateIndex
CREATE INDEX "_officerRankDepartments_B_index" ON "_officerRankDepartments"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_DepartmentValueToEmergencyVehicleValue_AB_unique" ON "_DepartmentValueToEmergencyVehicleValue"("A", "B");

-- CreateIndex
CREATE INDEX "_DepartmentValueToEmergencyVehicleValue_B_index" ON "_DepartmentValueToEmergencyVehicleValue"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_radioChannelDepartments_AB_unique" ON "_radioChannelDepartments"("A", "B");

-- CreateIndex
CREATE INDEX "_radioChannelDepartments_B_index" ON "_radioChannelDepartments"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_dlCategoryToLicenseExam_AB_unique" ON "_dlCategoryToLicenseExam"("A", "B");

-- CreateIndex
CREATE INDEX "_dlCategoryToLicenseExam_B_index" ON "_dlCategoryToLicenseExam"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_registeredBusinessVehicles_AB_unique" ON "_registeredBusinessVehicles"("A", "B");

-- CreateIndex
CREATE INDEX "_registeredBusinessVehicles_B_index" ON "_registeredBusinessVehicles"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_businessValueBusinessRoles_AB_unique" ON "_businessValueBusinessRoles"("A", "B");

-- CreateIndex
CREATE INDEX "_businessValueBusinessRoles_B_index" ON "_businessValueBusinessRoles"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_involvedOfficers_AB_unique" ON "_involvedOfficers"("A", "B");

-- CreateIndex
CREATE INDEX "_involvedOfficers_B_index" ON "_involvedOfficers"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Call911ToDivisionValue_AB_unique" ON "_Call911ToDivisionValue"("A", "B");

-- CreateIndex
CREATE INDEX "_Call911ToDivisionValue_B_index" ON "_Call911ToDivisionValue"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Call911ToDepartmentValue_AB_unique" ON "_Call911ToDepartmentValue"("A", "B");

-- CreateIndex
CREATE INDEX "_Call911ToDepartmentValue_B_index" ON "_Call911ToDepartmentValue"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Call911ToLeoIncident_AB_unique" ON "_Call911ToLeoIncident"("A", "B");

-- CreateIndex
CREATE INDEX "_Call911ToLeoIncident_B_index" ON "_Call911ToLeoIncident"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_RecordToViolation_AB_unique" ON "_RecordToViolation"("A", "B");

-- CreateIndex
CREATE INDEX "_RecordToViolation_B_index" ON "_RecordToViolation"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CustomFieldValueToRegisteredVehicle_AB_unique" ON "_CustomFieldValueToRegisteredVehicle"("A", "B");

-- CreateIndex
CREATE INDEX "_CustomFieldValueToRegisteredVehicle_B_index" ON "_CustomFieldValueToRegisteredVehicle"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CustomFieldValueToWeapon_AB_unique" ON "_CustomFieldValueToWeapon"("A", "B");

-- CreateIndex
CREATE INDEX "_CustomFieldValueToWeapon_B_index" ON "_CustomFieldValueToWeapon"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CustomRoleToUser_AB_unique" ON "_CustomRoleToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_CustomRoleToUser_B_index" ON "_CustomRoleToUser"("B");

-- AddForeignKey
ALTER TABLE "cad" ADD CONSTRAINT "cad_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cad" ADD CONSTRAINT "cad_miscCadSettingsId_fkey" FOREIGN KEY ("miscCadSettingsId") REFERENCES "MiscCadSettings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cad" ADD CONSTRAINT "cad_apiTokenId_fkey" FOREIGN KEY ("apiTokenId") REFERENCES "ApiToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cad" ADD CONSTRAINT "cad_autoSetUserPropertiesId_fkey" FOREIGN KEY ("autoSetUserPropertiesId") REFERENCES "AutoSetPropertiesUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cad" ADD CONSTRAINT "cad_discordRolesId_fkey" FOREIGN KEY ("discordRolesId") REFERENCES "DiscordRoles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadFeature" ADD CONSTRAINT "CadFeature_cadId_fkey" FOREIGN KEY ("cadId") REFERENCES "cad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveMapURL" ADD CONSTRAINT "LiveMapURL_miscCadSettingsId_fkey" FOREIGN KEY ("miscCadSettingsId") REFERENCES "MiscCadSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawWebhook" ADD CONSTRAINT "RawWebhook_miscCadSettingsId_fkey" FOREIGN KEY ("miscCadSettingsId") REFERENCES "MiscCadSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscordWebhook" ADD CONSTRAINT "DiscordWebhook_miscCadSettingsId_fkey" FOREIGN KEY ("miscCadSettingsId") REFERENCES "MiscCadSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiTokenLog" ADD CONSTRAINT "ApiTokenLog_apiTokenId_fkey" FOREIGN KEY ("apiTokenId") REFERENCES "ApiToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscordRoles" ADD CONSTRAINT "DiscordRoles_whitelistedRoleId_fkey" FOREIGN KEY ("whitelistedRoleId") REFERENCES "DiscordRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscordRole" ADD CONSTRAINT "DiscordRole_discordRolesId_fkey" FOREIGN KEY ("discordRolesId") REFERENCES "DiscordRoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_executorId_fkey" FOREIGN KEY ("executorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_soundSettingsId_fkey" FOREIGN KEY ("soundSettingsId") REFERENCES "UserSoundSettings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_apiTokenId_fkey" FOREIGN KEY ("apiTokenId") REFERENCES "ApiToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToAddDefaultPermissions" ADD CONSTRAINT "ToAddDefaultPermissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User2FA" ADD CONSTRAINT "User2FA_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_genderId_fkey" FOREIGN KEY ("genderId") REFERENCES "Value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_ethnicityId_fkey" FOREIGN KEY ("ethnicityId") REFERENCES "Value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_driversLicenseId_fkey" FOREIGN KEY ("driversLicenseId") REFERENCES "Value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_weaponLicenseId_fkey" FOREIGN KEY ("weaponLicenseId") REFERENCES "Value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_pilotLicenseId_fkey" FOREIGN KEY ("pilotLicenseId") REFERENCES "Value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_waterLicenseId_fkey" FOREIGN KEY ("waterLicenseId") REFERENCES "Value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_huntingLicenseId_fkey" FOREIGN KEY ("huntingLicenseId") REFERENCES "Value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_fishingLicenseId_fkey" FOREIGN KEY ("fishingLicenseId") REFERENCES "Value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_ccwId_fkey" FOREIGN KEY ("ccwId") REFERENCES "Value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_suspendedLicensesId_fkey" FOREIGN KEY ("suspendedLicensesId") REFERENCES "SuspendedCitizenLicenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_licensePointsId_fkey" FOREIGN KEY ("licensePointsId") REFERENCES "CitizenLicensePoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenAlias" ADD CONSTRAINT "CitizenAlias_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenDrugTest" ADD CONSTRAINT "CitizenDrugTest_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenDrugTest" ADD CONSTRAINT "CitizenDrugTest_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenClaimRequest" ADD CONSTRAINT "CitizenClaimRequest_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenClaimRequest" ADD CONSTRAINT "CitizenClaimRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenClaimRequest" ADD CONSTRAINT "CitizenClaimRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "RegisteredVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegisteredVehicle" ADD CONSTRAINT "RegisteredVehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegisteredVehicle" ADD CONSTRAINT "RegisteredVehicle_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegisteredVehicle" ADD CONSTRAINT "RegisteredVehicle_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegisteredVehicle" ADD CONSTRAINT "RegisteredVehicle_registrationStatusId_fkey" FOREIGN KEY ("registrationStatusId") REFERENCES "Value"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegisteredVehicle" ADD CONSTRAINT "RegisteredVehicle_insuranceStatusId_fkey" FOREIGN KEY ("insuranceStatusId") REFERENCES "Value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Weapon" ADD CONSTRAINT "Weapon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Weapon" ADD CONSTRAINT "Weapon_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Weapon" ADD CONSTRAINT "Weapon_registrationStatusId_fkey" FOREIGN KEY ("registrationStatusId") REFERENCES "Value"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Weapon" ADD CONSTRAINT "Weapon_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "WeaponValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_bloodGroupId_fkey" FOREIGN KEY ("bloodGroupId") REFERENCES "Value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetMedicalRecord" ADD CONSTRAINT "PetMedicalRecord_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorVisit" ADD CONSTRAINT "DoctorVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorVisit" ADD CONSTRAINT "DoctorVisit_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddressValue" ADD CONSTRAINT "AddressValue_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "Value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenalCode" ADD CONSTRAINT "PenalCode_warningApplicableId_fkey" FOREIGN KEY ("warningApplicableId") REFERENCES "WarningApplicable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenalCode" ADD CONSTRAINT "PenalCode_warningNotApplicableId_fkey" FOREIGN KEY ("warningNotApplicableId") REFERENCES "WarningNotApplicable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenalCode" ADD CONSTRAINT "PenalCode_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PenalCodeGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_penalCodeId_fkey" FOREIGN KEY ("penalCodeId") REFERENCES "PenalCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeizedItem" ADD CONSTRAINT "SeizedItem_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DivisionValue" ADD CONSTRAINT "DivisionValue_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "Value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DivisionValue" ADD CONSTRAINT "DivisionValue_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "DepartmentValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentValue" ADD CONSTRAINT "DepartmentValue_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "Value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentValue" ADD CONSTRAINT "DepartmentValue_statusValueId_fkey" FOREIGN KEY ("statusValueId") REFERENCES "StatusValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentValue" ADD CONSTRAINT "DepartmentValue_defaultOfficerRankId_fkey" FOREIGN KEY ("defaultOfficerRankId") REFERENCES "Value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentValueLink" ADD CONSTRAINT "DepartmentValueLink_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "DepartmentValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyVehicleValue" ADD CONSTRAINT "EmergencyVehicleValue_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "Value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriversLicenseCategoryValue" ADD CONSTRAINT "DriversLicenseCategoryValue_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "Value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleValue" ADD CONSTRAINT "VehicleValue_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "Value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeaponValue" ADD CONSTRAINT "WeaponValue_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "Value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallTypeValue" ADD CONSTRAINT "CallTypeValue_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "Value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_executorId_fkey" FOREIGN KEY ("executorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BleeterProfile" ADD CONSTRAINT "BleeterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BleeterProfileFollow" ADD CONSTRAINT "BleeterProfileFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BleeterProfileFollow" ADD CONSTRAINT "BleeterProfileFollow_followerProfileId_fkey" FOREIGN KEY ("followerProfileId") REFERENCES "BleeterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BleeterProfileFollow" ADD CONSTRAINT "BleeterProfileFollow_followingProfileId_fkey" FOREIGN KEY ("followingProfileId") REFERENCES "BleeterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BleeterPost" ADD CONSTRAINT "BleeterPost_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "BleeterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BleeterPost" ADD CONSTRAINT "BleeterPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowCall" ADD CONSTRAINT "TowCall_assignedUnitId_fkey" FOREIGN KEY ("assignedUnitId") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowCall" ADD CONSTRAINT "TowCall_deliveryAddressId_fkey" FOREIGN KEY ("deliveryAddressId") REFERENCES "Value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TowCall" ADD CONSTRAINT "TowCall_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxiCall" ADD CONSTRAINT "TaxiCall_assignedUnitId_fkey" FOREIGN KEY ("assignedUnitId") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxiCall" ADD CONSTRAINT "TaxiCall_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "EmployeeValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPost" ADD CONSTRAINT "BusinessPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPost" ADD CONSTRAINT "BusinessPost_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPost" ADD CONSTRAINT "BusinessPost_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeValue" ADD CONSTRAINT "EmployeeValue_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "Value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Officer" ADD CONSTRAINT "Officer_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "DepartmentValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Officer" ADD CONSTRAINT "Officer_activeDivisionCallsignId_fkey" FOREIGN KEY ("activeDivisionCallsignId") REFERENCES "IndividualDivisionCallsign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Officer" ADD CONSTRAINT "Officer_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "Value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Officer" ADD CONSTRAINT "Officer_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "StatusValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Officer" ADD CONSTRAINT "Officer_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Officer" ADD CONSTRAINT "Officer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Officer" ADD CONSTRAINT "Officer_whitelistStatusId_fkey" FOREIGN KEY ("whitelistStatusId") REFERENCES "LeoWhitelistStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Officer" ADD CONSTRAINT "Officer_activeIncidentId_fkey" FOREIGN KEY ("activeIncidentId") REFERENCES "LeoIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Officer" ADD CONSTRAINT "Officer_activeCallId_fkey" FOREIGN KEY ("activeCallId") REFERENCES "Call911"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Officer" ADD CONSTRAINT "Officer_combinedLeoUnitId_fkey" FOREIGN KEY ("combinedLeoUnitId") REFERENCES "CombinedLeoUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Officer" ADD CONSTRAINT "Officer_activeVehicleId_fkey" FOREIGN KEY ("activeVehicleId") REFERENCES "EmergencyVehicleValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualDivisionCallsign" ADD CONSTRAINT "IndividualDivisionCallsign_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "DivisionValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualDivisionCallsign" ADD CONSTRAINT "IndividualDivisionCallsign_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitQualification" ADD CONSTRAINT "UnitQualification_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "QualificationValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitQualification" ADD CONSTRAINT "UnitQualification_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitQualification" ADD CONSTRAINT "UnitQualification_emsFdDeputyId_fkey" FOREIGN KEY ("emsFdDeputyId") REFERENCES "EmsFdDeputy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualificationValue" ADD CONSTRAINT "QualificationValue_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "Value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeoWhitelistStatus" ADD CONSTRAINT "LeoWhitelistStatus_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "DepartmentValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusValue" ADD CONSTRAINT "StatusValue_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "Value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficerLog" ADD CONSTRAINT "OfficerLog_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficerLog" ADD CONSTRAINT "OfficerLog_emsFdDeputyId_fkey" FOREIGN KEY ("emsFdDeputyId") REFERENCES "EmsFdDeputy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpoundedVehicle" ADD CONSTRAINT "ImpoundedVehicle_registeredVehicleId_fkey" FOREIGN KEY ("registeredVehicleId") REFERENCES "RegisteredVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpoundedVehicle" ADD CONSTRAINT "ImpoundedVehicle_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "Value"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpoundedVehicle" ADD CONSTRAINT "ImpoundedVehicle_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeoIncident" ADD CONSTRAINT "LeoIncident_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeoIncident" ADD CONSTRAINT "LeoIncident_situationCodeId_fkey" FOREIGN KEY ("situationCodeId") REFERENCES "StatusValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentEvent" ADD CONSTRAINT "IncidentEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "LeoIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentEvent" ADD CONSTRAINT "IncidentEvent_emsFdIncidentId_fkey" FOREIGN KEY ("emsFdIncidentId") REFERENCES "EmsFdIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombinedLeoUnit" ADD CONSTRAINT "CombinedLeoUnit_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "DepartmentValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombinedLeoUnit" ADD CONSTRAINT "CombinedLeoUnit_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "StatusValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombinedLeoUnit" ADD CONSTRAINT "CombinedLeoUnit_activeCallId_fkey" FOREIGN KEY ("activeCallId") REFERENCES "Call911"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombinedLeoUnit" ADD CONSTRAINT "CombinedLeoUnit_activeIncidentId_fkey" FOREIGN KEY ("activeIncidentId") REFERENCES "LeoIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombinedLeoUnit" ADD CONSTRAINT "CombinedLeoUnit_activeVehicleId_fkey" FOREIGN KEY ("activeVehicleId") REFERENCES "EmergencyVehicleValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombinedLeoUnit" ADD CONSTRAINT "CombinedLeoUnit_emsFdIncidentId_fkey" FOREIGN KEY ("emsFdIncidentId") REFERENCES "EmsFdIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombinedEmsFdUnit" ADD CONSTRAINT "CombinedEmsFdUnit_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "DepartmentValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombinedEmsFdUnit" ADD CONSTRAINT "CombinedEmsFdUnit_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "StatusValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombinedEmsFdUnit" ADD CONSTRAINT "CombinedEmsFdUnit_activeCallId_fkey" FOREIGN KEY ("activeCallId") REFERENCES "Call911"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombinedEmsFdUnit" ADD CONSTRAINT "CombinedEmsFdUnit_activeIncidentId_fkey" FOREIGN KEY ("activeIncidentId") REFERENCES "LeoIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombinedEmsFdUnit" ADD CONSTRAINT "CombinedEmsFdUnit_activeVehicleId_fkey" FOREIGN KEY ("activeVehicleId") REFERENCES "EmergencyVehicleValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombinedEmsFdUnit" ADD CONSTRAINT "CombinedEmsFdUnit_emsFdIncidentId_fkey" FOREIGN KEY ("emsFdIncidentId") REFERENCES "EmsFdIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveDispatchers" ADD CONSTRAINT "ActiveDispatchers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveDispatchers" ADD CONSTRAINT "ActiveDispatchers_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "DepartmentValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchChat" ADD CONSTRAINT "DispatchChat_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "ChatCreator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchChat" ADD CONSTRAINT "DispatchChat_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call911"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchChat" ADD CONSTRAINT "DispatchChat_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "LeoIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatCreator" ADD CONSTRAINT "ChatCreator_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatCreator" ADD CONSTRAINT "ChatCreator_emsFdDeputyId_fkey" FOREIGN KEY ("emsFdDeputyId") REFERENCES "EmsFdDeputy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatCreator" ADD CONSTRAINT "ChatCreator_combinedLeoId_fkey" FOREIGN KEY ("combinedLeoId") REFERENCES "CombinedLeoUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatCreator" ADD CONSTRAINT "ChatCreator_combinedEmsFdId_fkey" FOREIGN KEY ("combinedEmsFdId") REFERENCES "CombinedEmsFdUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call911" ADD CONSTRAINT "Call911_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call911" ADD CONSTRAINT "Call911_situationCodeId_fkey" FOREIGN KEY ("situationCodeId") REFERENCES "StatusValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call911" ADD CONSTRAINT "Call911_dispositionCodeId_fkey" FOREIGN KEY ("dispositionCodeId") REFERENCES "CallTypeValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call911" ADD CONSTRAINT "Call911_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "CallTypeValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call911" ADD CONSTRAINT "Call911_gtaMapPositionId_fkey" FOREIGN KEY ("gtaMapPositionId") REFERENCES "GTAMapPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call911" ADD CONSTRAINT "Call911_emsFdIncidentId_fkey" FOREIGN KEY ("emsFdIncidentId") REFERENCES "EmsFdIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedUnit" ADD CONSTRAINT "AssignedUnit_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedUnit" ADD CONSTRAINT "AssignedUnit_emsFdDeputyId_fkey" FOREIGN KEY ("emsFdDeputyId") REFERENCES "EmsFdDeputy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedUnit" ADD CONSTRAINT "AssignedUnit_combinedLeoId_fkey" FOREIGN KEY ("combinedLeoId") REFERENCES "CombinedLeoUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedUnit" ADD CONSTRAINT "AssignedUnit_combinedEmsFdId_fkey" FOREIGN KEY ("combinedEmsFdId") REFERENCES "CombinedEmsFdUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedUnit" ADD CONSTRAINT "AssignedUnit_call911Id_fkey" FOREIGN KEY ("call911Id") REFERENCES "Call911"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedWarrantOfficer" ADD CONSTRAINT "AssignedWarrantOfficer_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedWarrantOfficer" ADD CONSTRAINT "AssignedWarrantOfficer_combinedLeoId_fkey" FOREIGN KEY ("combinedLeoId") REFERENCES "CombinedLeoUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedWarrantOfficer" ADD CONSTRAINT "AssignedWarrantOfficer_warrantId_fkey" FOREIGN KEY ("warrantId") REFERENCES "Warrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentInvolvedUnit" ADD CONSTRAINT "IncidentInvolvedUnit_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentInvolvedUnit" ADD CONSTRAINT "IncidentInvolvedUnit_emsFdDeputyId_fkey" FOREIGN KEY ("emsFdDeputyId") REFERENCES "EmsFdDeputy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentInvolvedUnit" ADD CONSTRAINT "IncidentInvolvedUnit_combinedLeoId_fkey" FOREIGN KEY ("combinedLeoId") REFERENCES "CombinedLeoUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentInvolvedUnit" ADD CONSTRAINT "IncidentInvolvedUnit_combinedEmsFdId_fkey" FOREIGN KEY ("combinedEmsFdId") REFERENCES "CombinedEmsFdUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentInvolvedUnit" ADD CONSTRAINT "IncidentInvolvedUnit_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "LeoIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentInvolvedUnit" ADD CONSTRAINT "IncidentInvolvedUnit_emsFdIncidentId_fkey" FOREIGN KEY ("emsFdIncidentId") REFERENCES "EmsFdIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call911Event" ADD CONSTRAINT "Call911Event_call911Id_fkey" FOREIGN KEY ("call911Id") REFERENCES "Call911"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bolo" ADD CONSTRAINT "Bolo_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "RecordRelease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_CourtEntryId_fkey" FOREIGN KEY ("CourtEntryId") REFERENCES "CourtEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_expungementRequestId_fkey" FOREIGN KEY ("expungementRequestId") REFERENCES "ExpungementRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "RegisteredVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_call911Id_fkey" FOREIGN KEY ("call911Id") REFERENCES "Call911"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "LeoIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_emsFdIncidentId_fkey" FOREIGN KEY ("emsFdIncidentId") REFERENCES "EmsFdIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordRelease" ADD CONSTRAINT "RecordRelease_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warrant" ADD CONSTRAINT "Warrant_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warrant" ADD CONSTRAINT "Warrant_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warrant" ADD CONSTRAINT "Warrant_expungementRequestId_fkey" FOREIGN KEY ("expungementRequestId") REFERENCES "ExpungementRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordLog" ADD CONSTRAINT "RecordLog_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordLog" ADD CONSTRAINT "RecordLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordLog" ADD CONSTRAINT "RecordLog_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordLog" ADD CONSTRAINT "RecordLog_warrantId_fkey" FOREIGN KEY ("warrantId") REFERENCES "Warrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpungementRequest" ADD CONSTRAINT "ExpungementRequest_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpungementRequest" ADD CONSTRAINT "ExpungementRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NameChangeRequest" ADD CONSTRAINT "NameChangeRequest_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NameChangeRequest" ADD CONSTRAINT "NameChangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtDate" ADD CONSTRAINT "CourtDate_courtEntryId_fkey" FOREIGN KEY ("courtEntryId") REFERENCES "CourtEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmsFdDeputy" ADD CONSTRAINT "EmsFdDeputy_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "DepartmentValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmsFdDeputy" ADD CONSTRAINT "EmsFdDeputy_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "DivisionValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmsFdDeputy" ADD CONSTRAINT "EmsFdDeputy_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "Value"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmsFdDeputy" ADD CONSTRAINT "EmsFdDeputy_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "StatusValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmsFdDeputy" ADD CONSTRAINT "EmsFdDeputy_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmsFdDeputy" ADD CONSTRAINT "EmsFdDeputy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmsFdDeputy" ADD CONSTRAINT "EmsFdDeputy_activeCallId_fkey" FOREIGN KEY ("activeCallId") REFERENCES "Call911"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmsFdDeputy" ADD CONSTRAINT "EmsFdDeputy_activeIncidentId_fkey" FOREIGN KEY ("activeIncidentId") REFERENCES "LeoIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmsFdDeputy" ADD CONSTRAINT "EmsFdDeputy_whitelistStatusId_fkey" FOREIGN KEY ("whitelistStatusId") REFERENCES "LeoWhitelistStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmsFdDeputy" ADD CONSTRAINT "EmsFdDeputy_activeVehicleId_fkey" FOREIGN KEY ("activeVehicleId") REFERENCES "EmergencyVehicleValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmsFdDeputy" ADD CONSTRAINT "EmsFdDeputy_combinedEmsFdUnitId_fkey" FOREIGN KEY ("combinedEmsFdUnitId") REFERENCES "CombinedEmsFdUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmsFdIncident" ADD CONSTRAINT "EmsFdIncident_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "EmsFdDeputy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmsFdIncident" ADD CONSTRAINT "EmsFdIncident_situationCodeId_fkey" FOREIGN KEY ("situationCodeId") REFERENCES "StatusValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruckLog" ADD CONSTRAINT "TruckLog_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruckLog" ADD CONSTRAINT "TruckLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruckLog" ADD CONSTRAINT "TruckLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "RegisteredVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseExam" ADD CONSTRAINT "LicenseExam_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseExam" ADD CONSTRAINT "LicenseExam_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "Value"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CustomField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRole" ADD CONSTRAINT "CustomRole_discordRoleId_fkey" FOREIGN KEY ("discordRoleId") REFERENCES "DiscordRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourthousePost" ADD CONSTRAINT "CourthousePost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveTone" ADD CONSTRAINT "ActiveTone_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TonePreset" ADD CONSTRAINT "TonePreset_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "DepartmentValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FivemCharacter" ADD CONSTRAINT "FivemCharacter_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FivemVehicle" ADD CONSTRAINT "FivemVehicle_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "RegisteredVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_leoRoles" ADD CONSTRAINT "_leoRoles_A_fkey" FOREIGN KEY ("A") REFERENCES "DiscordRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_leoRoles" ADD CONSTRAINT "_leoRoles_B_fkey" FOREIGN KEY ("B") REFERENCES "DiscordRoles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_emsFdRoles" ADD CONSTRAINT "_emsFdRoles_A_fkey" FOREIGN KEY ("A") REFERENCES "DiscordRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_emsFdRoles" ADD CONSTRAINT "_emsFdRoles_B_fkey" FOREIGN KEY ("B") REFERENCES "DiscordRoles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_dispatchRoles" ADD CONSTRAINT "_dispatchRoles_A_fkey" FOREIGN KEY ("A") REFERENCES "DiscordRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_dispatchRoles" ADD CONSTRAINT "_dispatchRoles_B_fkey" FOREIGN KEY ("B") REFERENCES "DiscordRoles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_leoSupervisorRoles" ADD CONSTRAINT "_leoSupervisorRoles_A_fkey" FOREIGN KEY ("A") REFERENCES "DiscordRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_leoSupervisorRoles" ADD CONSTRAINT "_leoSupervisorRoles_B_fkey" FOREIGN KEY ("B") REFERENCES "DiscordRoles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_taxiRoles" ADD CONSTRAINT "_taxiRoles_A_fkey" FOREIGN KEY ("A") REFERENCES "DiscordRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_taxiRoles" ADD CONSTRAINT "_taxiRoles_B_fkey" FOREIGN KEY ("B") REFERENCES "DiscordRoles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_towRoles" ADD CONSTRAINT "_towRoles_A_fkey" FOREIGN KEY ("A") REFERENCES "DiscordRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_towRoles" ADD CONSTRAINT "_towRoles_B_fkey" FOREIGN KEY ("B") REFERENCES "DiscordRoles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_courthouseRoles" ADD CONSTRAINT "_courthouseRoles_A_fkey" FOREIGN KEY ("A") REFERENCES "DiscordRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_courthouseRoles" ADD CONSTRAINT "_courthouseRoles_B_fkey" FOREIGN KEY ("B") REFERENCES "DiscordRoles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_adminRoles" ADD CONSTRAINT "_adminRoles_A_fkey" FOREIGN KEY ("A") REFERENCES "DiscordRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_adminRoles" ADD CONSTRAINT "_adminRoles_B_fkey" FOREIGN KEY ("B") REFERENCES "DiscordRoles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_dlCategoryToDLCategory" ADD CONSTRAINT "_dlCategoryToDLCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_dlCategoryToDLCategory" ADD CONSTRAINT "_dlCategoryToDLCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "DriversLicenseCategoryValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_citizenFlags" ADD CONSTRAINT "_citizenFlags_A_fkey" FOREIGN KEY ("A") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_citizenFlags" ADD CONSTRAINT "_citizenFlags_B_fkey" FOREIGN KEY ("B") REFERENCES "Value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_citizenAddressFlags" ADD CONSTRAINT "_citizenAddressFlags_A_fkey" FOREIGN KEY ("A") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_citizenAddressFlags" ADD CONSTRAINT "_citizenAddressFlags_B_fkey" FOREIGN KEY ("B") REFERENCES "Value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CitizenToCustomFieldValue" ADD CONSTRAINT "_CitizenToCustomFieldValue_A_fkey" FOREIGN KEY ("A") REFERENCES "Citizen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CitizenToCustomFieldValue" ADD CONSTRAINT "_CitizenToCustomFieldValue_B_fkey" FOREIGN KEY ("B") REFERENCES "CustomFieldValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_vehicleFlags" ADD CONSTRAINT "_vehicleFlags_A_fkey" FOREIGN KEY ("A") REFERENCES "RegisteredVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_vehicleFlags" ADD CONSTRAINT "_vehicleFlags_B_fkey" FOREIGN KEY ("B") REFERENCES "Value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_registeredVehicleTrimLevels" ADD CONSTRAINT "_registeredVehicleTrimLevels_A_fkey" FOREIGN KEY ("A") REFERENCES "RegisteredVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_registeredVehicleTrimLevels" ADD CONSTRAINT "_registeredVehicleTrimLevels_B_fkey" FOREIGN KEY ("B") REFERENCES "Value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_vehicleTrimLevels" ADD CONSTRAINT "_vehicleTrimLevels_A_fkey" FOREIGN KEY ("A") REFERENCES "Value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_vehicleTrimLevels" ADD CONSTRAINT "_vehicleTrimLevels_B_fkey" FOREIGN KEY ("B") REFERENCES "VehicleValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_weaponFlags" ADD CONSTRAINT "_weaponFlags_A_fkey" FOREIGN KEY ("A") REFERENCES "Value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_weaponFlags" ADD CONSTRAINT "_weaponFlags_B_fkey" FOREIGN KEY ("B") REFERENCES "Weapon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_officerDivisionsToDivision" ADD CONSTRAINT "_officerDivisionsToDivision_A_fkey" FOREIGN KEY ("A") REFERENCES "DivisionValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_officerDivisionsToDivision" ADD CONSTRAINT "_officerDivisionsToDivision_B_fkey" FOREIGN KEY ("B") REFERENCES "Officer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DivisionValueToEmergencyVehicleValue" ADD CONSTRAINT "_DivisionValueToEmergencyVehicleValue_A_fkey" FOREIGN KEY ("A") REFERENCES "DivisionValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DivisionValueToEmergencyVehicleValue" ADD CONSTRAINT "_DivisionValueToEmergencyVehicleValue_B_fkey" FOREIGN KEY ("B") REFERENCES "EmergencyVehicleValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentValueToQualificationValue" ADD CONSTRAINT "_DepartmentValueToQualificationValue_A_fkey" FOREIGN KEY ("A") REFERENCES "DepartmentValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentValueToQualificationValue" ADD CONSTRAINT "_DepartmentValueToQualificationValue_B_fkey" FOREIGN KEY ("B") REFERENCES "QualificationValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_officerRankDepartments" ADD CONSTRAINT "_officerRankDepartments_A_fkey" FOREIGN KEY ("A") REFERENCES "DepartmentValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_officerRankDepartments" ADD CONSTRAINT "_officerRankDepartments_B_fkey" FOREIGN KEY ("B") REFERENCES "Value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentValueToEmergencyVehicleValue" ADD CONSTRAINT "_DepartmentValueToEmergencyVehicleValue_A_fkey" FOREIGN KEY ("A") REFERENCES "DepartmentValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentValueToEmergencyVehicleValue" ADD CONSTRAINT "_DepartmentValueToEmergencyVehicleValue_B_fkey" FOREIGN KEY ("B") REFERENCES "EmergencyVehicleValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_radioChannelDepartments" ADD CONSTRAINT "_radioChannelDepartments_A_fkey" FOREIGN KEY ("A") REFERENCES "DepartmentValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_radioChannelDepartments" ADD CONSTRAINT "_radioChannelDepartments_B_fkey" FOREIGN KEY ("B") REFERENCES "RadioChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_dlCategoryToLicenseExam" ADD CONSTRAINT "_dlCategoryToLicenseExam_A_fkey" FOREIGN KEY ("A") REFERENCES "DriversLicenseCategoryValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_dlCategoryToLicenseExam" ADD CONSTRAINT "_dlCategoryToLicenseExam_B_fkey" FOREIGN KEY ("B") REFERENCES "LicenseExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_registeredBusinessVehicles" ADD CONSTRAINT "_registeredBusinessVehicles_A_fkey" FOREIGN KEY ("A") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_registeredBusinessVehicles" ADD CONSTRAINT "_registeredBusinessVehicles_B_fkey" FOREIGN KEY ("B") REFERENCES "RegisteredVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_businessValueBusinessRoles" ADD CONSTRAINT "_businessValueBusinessRoles_A_fkey" FOREIGN KEY ("A") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_businessValueBusinessRoles" ADD CONSTRAINT "_businessValueBusinessRoles_B_fkey" FOREIGN KEY ("B") REFERENCES "EmployeeValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_involvedOfficers" ADD CONSTRAINT "_involvedOfficers_A_fkey" FOREIGN KEY ("A") REFERENCES "LeoIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_involvedOfficers" ADD CONSTRAINT "_involvedOfficers_B_fkey" FOREIGN KEY ("B") REFERENCES "Officer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Call911ToDivisionValue" ADD CONSTRAINT "_Call911ToDivisionValue_A_fkey" FOREIGN KEY ("A") REFERENCES "Call911"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Call911ToDivisionValue" ADD CONSTRAINT "_Call911ToDivisionValue_B_fkey" FOREIGN KEY ("B") REFERENCES "DivisionValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Call911ToDepartmentValue" ADD CONSTRAINT "_Call911ToDepartmentValue_A_fkey" FOREIGN KEY ("A") REFERENCES "Call911"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Call911ToDepartmentValue" ADD CONSTRAINT "_Call911ToDepartmentValue_B_fkey" FOREIGN KEY ("B") REFERENCES "DepartmentValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Call911ToLeoIncident" ADD CONSTRAINT "_Call911ToLeoIncident_A_fkey" FOREIGN KEY ("A") REFERENCES "Call911"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Call911ToLeoIncident" ADD CONSTRAINT "_Call911ToLeoIncident_B_fkey" FOREIGN KEY ("B") REFERENCES "LeoIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RecordToViolation" ADD CONSTRAINT "_RecordToViolation_A_fkey" FOREIGN KEY ("A") REFERENCES "Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RecordToViolation" ADD CONSTRAINT "_RecordToViolation_B_fkey" FOREIGN KEY ("B") REFERENCES "Violation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomFieldValueToRegisteredVehicle" ADD CONSTRAINT "_CustomFieldValueToRegisteredVehicle_A_fkey" FOREIGN KEY ("A") REFERENCES "CustomFieldValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomFieldValueToRegisteredVehicle" ADD CONSTRAINT "_CustomFieldValueToRegisteredVehicle_B_fkey" FOREIGN KEY ("B") REFERENCES "RegisteredVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomFieldValueToWeapon" ADD CONSTRAINT "_CustomFieldValueToWeapon_A_fkey" FOREIGN KEY ("A") REFERENCES "CustomFieldValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomFieldValueToWeapon" ADD CONSTRAINT "_CustomFieldValueToWeapon_B_fkey" FOREIGN KEY ("B") REFERENCES "Weapon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomRoleToUser" ADD CONSTRAINT "_CustomRoleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "CustomRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomRoleToUser" ADD CONSTRAINT "_CustomRoleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

