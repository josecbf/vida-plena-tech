-- CreateEnum
CREATE TYPE "EventAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "EventAttendanceSource" AS ENUM ('PROVER', 'MANUAL');

-- CreateTable
CREATE TABLE "EventAttendance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventSessionId" TEXT,
    "eventRegistrationId" TEXT,
    "personId" TEXT,
    "status" "EventAttendanceStatus" NOT NULL,
    "source" "EventAttendanceSource" NOT NULL DEFAULT 'PROVER',
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "sourceMark" TEXT,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventAttendance_tenantId_idx" ON "EventAttendance"("tenantId");

-- CreateIndex
CREATE INDEX "EventAttendance_eventId_idx" ON "EventAttendance"("eventId");

-- CreateIndex
CREATE INDEX "EventAttendance_eventSessionId_idx" ON "EventAttendance"("eventSessionId");

-- CreateIndex
CREATE INDEX "EventAttendance_eventRegistrationId_idx" ON "EventAttendance"("eventRegistrationId");

-- CreateIndex
CREATE INDEX "EventAttendance_personId_idx" ON "EventAttendance"("personId");

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_eventSessionId_fkey" FOREIGN KEY ("eventSessionId") REFERENCES "EventSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_eventRegistrationId_fkey" FOREIGN KEY ("eventRegistrationId") REFERENCES "EventRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
