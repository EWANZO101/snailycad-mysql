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

-- AddForeignKey
ALTER TABLE "TonePreset" ADD CONSTRAINT "TonePreset_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "DepartmentValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
