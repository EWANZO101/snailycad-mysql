-- Fix: `dotLayoutOrder` was added without a DEFAULT, but the Prisma schema
-- declares it as dbgenerated("(json_array())"), so Prisma never sends a value
-- and `prisma.user.create()` failed with a null constraint violation.

-- Backfill rows created before this fix (MySQL fills JSON 'null', MariaDB '').
UPDATE `User` SET `dotLayoutOrder` = json_array()
WHERE `dotLayoutOrder` IS NULL OR CAST(`dotLayoutOrder` AS CHAR) IN ('', 'null');

-- AlterTable
ALTER TABLE `User` MODIFY `dotLayoutOrder` JSON NOT NULL DEFAULT (json_array());
