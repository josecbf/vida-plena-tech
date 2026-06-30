-- CreateEnum
CREATE TYPE "GrowthGroupMeetingStatus" AS ENUM ('SCHEDULED', 'HELD', 'CANCELED', 'UNKNOWN');

-- AlterTable
ALTER TABLE "GrowthGroupMeeting" ADD COLUMN     "endAt" TIMESTAMP(3),
ADD COLUMN     "metaJson" JSONB,
ADD COLUMN     "sourceStatus" TEXT,
ADD COLUMN     "status" "GrowthGroupMeetingStatus" NOT NULL DEFAULT 'HELD',
ADD COLUMN     "title" TEXT;
