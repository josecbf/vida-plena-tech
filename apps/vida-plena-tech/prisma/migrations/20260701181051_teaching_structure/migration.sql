-- CreateEnum
CREATE TYPE "TeachingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'FINISHED');

-- CreateTable
CREATE TABLE "Teaching" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" TEXT,
    "status" "TeachingStatus" NOT NULL DEFAULT 'PUBLISHED',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "sourceStatus" TEXT,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Teaching_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachingModule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER,
    "average" DOUBLE PRECISION,
    "presence" DOUBLE PRECISION,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeachingModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachingLesson" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "moduleId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER,
    "order" INTEGER,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeachingLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachingSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teachingId" TEXT NOT NULL,
    "moduleId" TEXT,
    "lessonId" TEXT,
    "title" TEXT,
    "subject" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "notes" TEXT,
    "sourceStatus" TEXT,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeachingSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Teaching_tenantId_idx" ON "Teaching"("tenantId");

-- CreateIndex
CREATE INDEX "Teaching_status_idx" ON "Teaching"("status");

-- CreateIndex
CREATE INDEX "Teaching_startsAt_idx" ON "Teaching"("startsAt");

-- CreateIndex
CREATE INDEX "TeachingModule_tenantId_idx" ON "TeachingModule"("tenantId");

-- CreateIndex
CREATE INDEX "TeachingLesson_tenantId_idx" ON "TeachingLesson"("tenantId");

-- CreateIndex
CREATE INDEX "TeachingLesson_moduleId_idx" ON "TeachingLesson"("moduleId");

-- CreateIndex
CREATE INDEX "TeachingSession_tenantId_idx" ON "TeachingSession"("tenantId");

-- CreateIndex
CREATE INDEX "TeachingSession_teachingId_idx" ON "TeachingSession"("teachingId");

-- CreateIndex
CREATE INDEX "TeachingSession_moduleId_idx" ON "TeachingSession"("moduleId");

-- CreateIndex
CREATE INDEX "TeachingSession_lessonId_idx" ON "TeachingSession"("lessonId");

-- CreateIndex
CREATE INDEX "TeachingSession_startsAt_idx" ON "TeachingSession"("startsAt");

-- AddForeignKey
ALTER TABLE "TeachingLesson" ADD CONSTRAINT "TeachingLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "TeachingModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingSession" ADD CONSTRAINT "TeachingSession_teachingId_fkey" FOREIGN KEY ("teachingId") REFERENCES "Teaching"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingSession" ADD CONSTRAINT "TeachingSession_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "TeachingModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingSession" ADD CONSTRAINT "TeachingSession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "TeachingLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
