-- AlterTable
ALTER TABLE "GcMembershipConflictResolution" ADD COLUMN     "appliedAt" TIMESTAMP(3),
ADD COLUMN     "appliedByUserId" TEXT,
ADD COLUMN     "applyBatchId" TEXT,
ADD COLUMN     "applyResultJson" JSONB;
