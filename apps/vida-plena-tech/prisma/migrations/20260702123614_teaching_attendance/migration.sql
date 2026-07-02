-- CreateEnum
CREATE TYPE "TeachingAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "TeachingAttendanceSource" AS ENUM ('PROVER', 'MANUAL');

-- CreateTable
CREATE TABLE "TeachingAttendance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teachingId" TEXT NOT NULL,
    "teachingSessionId" TEXT NOT NULL,
    "teachingRegistrationId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "status" "TeachingAttendanceStatus" NOT NULL,
    "source" "TeachingAttendanceSource" NOT NULL DEFAULT 'PROVER',
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "exitMark" TEXT,
    "score" DOUBLE PRECISION,
    "sourceMark" TEXT,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeachingAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeachingAttendance_tenantId_idx" ON "TeachingAttendance"("tenantId");

-- CreateIndex
CREATE INDEX "TeachingAttendance_teachingId_idx" ON "TeachingAttendance"("teachingId");

-- CreateIndex
CREATE INDEX "TeachingAttendance_teachingSessionId_idx" ON "TeachingAttendance"("teachingSessionId");

-- CreateIndex
CREATE INDEX "TeachingAttendance_teachingRegistrationId_idx" ON "TeachingAttendance"("teachingRegistrationId");

-- CreateIndex
CREATE INDEX "TeachingAttendance_personId_idx" ON "TeachingAttendance"("personId");

-- AddForeignKey
ALTER TABLE "TeachingAttendance" ADD CONSTRAINT "TeachingAttendance_teachingId_fkey" FOREIGN KEY ("teachingId") REFERENCES "Teaching"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAttendance" ADD CONSTRAINT "TeachingAttendance_teachingSessionId_fkey" FOREIGN KEY ("teachingSessionId") REFERENCES "TeachingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAttendance" ADD CONSTRAINT "TeachingAttendance_teachingRegistrationId_fkey" FOREIGN KEY ("teachingRegistrationId") REFERENCES "TeachingRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAttendance" ADD CONSTRAINT "TeachingAttendance_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
