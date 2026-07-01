-- CreateEnum
CREATE TYPE "TeachingRegistrationStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "TeachingRegistration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teachingId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "status" "TeachingRegistrationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "source" TEXT,
    "sourceStatus" TEXT,
    "sourceRegisteredAt" TIMESTAMP(3),
    "grade" DOUBLE PRECISION,
    "sourceGrade" TEXT,
    "sourcePaymentJson" JSONB,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeachingRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeachingRegistration_tenantId_idx" ON "TeachingRegistration"("tenantId");

-- CreateIndex
CREATE INDEX "TeachingRegistration_teachingId_idx" ON "TeachingRegistration"("teachingId");

-- CreateIndex
CREATE INDEX "TeachingRegistration_personId_idx" ON "TeachingRegistration"("personId");

-- CreateIndex
CREATE INDEX "TeachingRegistration_status_idx" ON "TeachingRegistration"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TeachingRegistration_teachingId_personId_key" ON "TeachingRegistration"("teachingId", "personId");

-- AddForeignKey
ALTER TABLE "TeachingRegistration" ADD CONSTRAINT "TeachingRegistration_teachingId_fkey" FOREIGN KEY ("teachingId") REFERENCES "Teaching"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingRegistration" ADD CONSTRAINT "TeachingRegistration_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
