-- CreateEnum
CREATE TYPE "RadioTransport" AS ENUM ('BUILTIN', 'LIVEKIT');

-- AlterEnum
ALTER TYPE "Feature" ADD VALUE 'RADIO';

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
CREATE TABLE "_radioChannelDepartments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_radioChannelDepartments_AB_unique" ON "_radioChannelDepartments"("A", "B");

-- CreateIndex
CREATE INDEX "_radioChannelDepartments_B_index" ON "_radioChannelDepartments"("B");

-- AddForeignKey
ALTER TABLE "_radioChannelDepartments" ADD CONSTRAINT "_radioChannelDepartments_A_fkey" FOREIGN KEY ("A") REFERENCES "DepartmentValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_radioChannelDepartments" ADD CONSTRAINT "_radioChannelDepartments_B_fkey" FOREIGN KEY ("B") REFERENCES "RadioChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

