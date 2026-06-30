-- CreateEnum
CREATE TYPE "GrowthGroupAttendanceSource" AS ENUM ('PARTICIPANT', 'VISITOR', 'MANUAL');

-- AlterTable
ALTER TABLE "GrowthGroupAttendance" ADD COLUMN     "metaJson" JSONB,
ADD COLUMN     "source" "GrowthGroupAttendanceSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "sourceMark" TEXT;
