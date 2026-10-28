-- CreateEnum
CREATE TYPE "CallSource" AS ENUM ('MANUAL', 'FIVEM', 'ERLC', 'OPS_PHONE');

-- AlterTable
ALTER TABLE "Call911" ADD COLUMN "source" "CallSource" NOT NULL DEFAULT 'MANUAL';
