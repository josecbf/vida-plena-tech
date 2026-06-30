-- CreateEnum
CREATE TYPE "GcMembershipConflictType" AS ENUM ('MULTIPLE_ACTIVE_GCS', 'DUPLICATE_MEMBERSHIP_CONFLICT', 'ACTIVE_MEMBERSHIP_IN_INACTIVE_GC', 'PERSON_MAPPING_NOT_FOUND');

-- CreateEnum
CREATE TYPE "GcMembershipConflictDecision" AS ENUM ('KEEP_THIS_GC_ACTIVE', 'CLOSE_THIS_MEMBERSHIP', 'IGNORE_DUPLICATE', 'CONSOLIDATE_HISTORY', 'MAP_ALIAS_TO_PERSON', 'REVIEW_LATER');

-- CreateEnum
CREATE TYPE "GcMembershipConflictResolutionStatus" AS ENUM ('DRAFT', 'READY_TO_APPLY', 'APPLIED', 'CANCELLED');

-- CreateTable
CREATE TABLE "GcMembershipConflictResolution" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "GcMembershipConflictType" NOT NULL,
    "conflictKey" TEXT NOT NULL,
    "personId" TEXT,
    "growthGroupId" TEXT,
    "proverPersonUuid" TEXT,
    "decision" "GcMembershipConflictDecision" NOT NULL,
    "status" "GcMembershipConflictResolutionStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "payloadJson" JSONB,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GcMembershipConflictResolution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GcMembershipConflictResolution_tenantId_type_idx" ON "GcMembershipConflictResolution"("tenantId", "type");

-- CreateIndex
CREATE INDEX "GcMembershipConflictResolution_tenantId_status_idx" ON "GcMembershipConflictResolution"("tenantId", "status");

-- CreateIndex
CREATE INDEX "GcMembershipConflictResolution_personId_idx" ON "GcMembershipConflictResolution"("personId");

-- CreateIndex
CREATE INDEX "GcMembershipConflictResolution_growthGroupId_idx" ON "GcMembershipConflictResolution"("growthGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "GcMembershipConflictResolution_tenantId_conflictKey_key" ON "GcMembershipConflictResolution"("tenantId", "conflictKey");
