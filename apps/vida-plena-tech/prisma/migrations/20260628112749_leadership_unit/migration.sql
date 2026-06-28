-- CreateEnum
CREATE TYPE "LeadershipUnitType" AS ENUM ('INDIVIDUAL', 'DUAL', 'COUPLE', 'HOUSEHOLD', 'TEAM');

-- CreateEnum
CREATE TYPE "LeadershipMemberRole" AS ENUM ('PRIMARY', 'SECONDARY', 'SPOUSE', 'ASSISTANT', 'IN_TRAINING', 'TEAM_MEMBER');

-- AlterTable
ALTER TABLE "GrowthGroup" ADD COLUMN     "areaPastorUnitId" TEXT,
ADD COLUMN     "coordinationUnitId" TEXT,
ADD COLUMN     "leadershipUnitId" TEXT,
ADD COLUMN     "supervisionUnitId" TEXT;

-- CreateTable
CREATE TABLE "LeadershipUnit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LeadershipUnitType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "LeadershipUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadershipUnitMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadershipUnitId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" "LeadershipMemberRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "LeadershipUnitMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadershipUnit_tenantId_idx" ON "LeadershipUnit"("tenantId");

-- CreateIndex
CREATE INDEX "LeadershipUnitMember_tenantId_idx" ON "LeadershipUnitMember"("tenantId");

-- CreateIndex
CREATE INDEX "LeadershipUnitMember_personId_idx" ON "LeadershipUnitMember"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadershipUnitMember_leadershipUnitId_personId_key" ON "LeadershipUnitMember"("leadershipUnitId", "personId");

-- CreateIndex
CREATE INDEX "GrowthGroup_leadershipUnitId_idx" ON "GrowthGroup"("leadershipUnitId");

-- AddForeignKey
ALTER TABLE "LeadershipUnitMember" ADD CONSTRAINT "LeadershipUnitMember_leadershipUnitId_fkey" FOREIGN KEY ("leadershipUnitId") REFERENCES "LeadershipUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadershipUnitMember" ADD CONSTRAINT "LeadershipUnitMember_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
