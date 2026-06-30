-- CreateEnum
CREATE TYPE "GrowthGroupMembershipSource" AS ENUM ('PARTICIPANT', 'VISITOR', 'MANUAL', 'IMPORTED');

-- AlterTable
ALTER TABLE "GrowthGroupMembership" ADD COLUMN     "source" "GrowthGroupMembershipSource" NOT NULL DEFAULT 'MANUAL';
