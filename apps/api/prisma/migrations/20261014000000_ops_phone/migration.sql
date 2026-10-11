-- CreateTable
CREATE TABLE `OpsPhoneSettings` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `apiUrl` VARCHAR(512) NULL,
    `apiKey` TEXT NULL,
    `webhookSecret` VARCHAR(255) NOT NULL,
    `sendSms` BOOLEAN NOT NULL DEFAULT true,
    `serviceMap` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OpsPhoneRequest` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `requestId` INTEGER NOT NULL,
    `service` VARCHAR(64) NOT NULL,
    `serviceNumber` VARCHAR(64) NULL,
    `target` VARCHAR(32) NOT NULL,
    `callerNumber` VARCHAR(64) NOT NULL,
    `callerName` VARCHAR(255) NULL,
    `call911Id` VARCHAR(191) NULL,
    `towCallId` VARCHAR(191) NULL,
    `taxiCallId` VARCHAR(191) NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'open',

    UNIQUE INDEX `OpsPhoneRequest_requestId_key`(`requestId`),
    INDEX `OpsPhoneRequest_call911Id_idx`(`call911Id`),
    INDEX `OpsPhoneRequest_towCallId_idx`(`towCallId`),
    INDEX `OpsPhoneRequest_taxiCallId_idx`(`taxiCallId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
