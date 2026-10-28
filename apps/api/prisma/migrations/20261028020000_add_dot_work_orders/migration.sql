-- CreateEnum
CREATE TYPE "DotWorkOrderPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "DotWorkOrderStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "DotWorkOrder" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "location" VARCHAR(255) NOT NULL,
    "postal" VARCHAR(255),
    "priority" "DotWorkOrderPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "DotWorkOrderStatus" NOT NULL DEFAULT 'OPEN',
    "departmentId" TEXT,
    "assignedWorkerId" TEXT,
    "createdByUserId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DotWorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DotWorkOrder_status_priority_departmentId_idx" ON "DotWorkOrder"("status", "priority", "departmentId");

-- AddForeignKey
ALTER TABLE "DotWorkOrder" ADD CONSTRAINT "DotWorkOrder_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "DepartmentValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DotWorkOrder" ADD CONSTRAINT "DotWorkOrder_assignedWorkerId_fkey" FOREIGN KEY ("assignedWorkerId") REFERENCES "DotWorker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
