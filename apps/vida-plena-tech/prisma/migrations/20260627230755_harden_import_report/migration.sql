-- CreateEnum
CREATE TYPE "ImportMode" AS ENUM ('DRY_RUN', 'APPLY');

-- CreateEnum
CREATE TYPE "ImportOperation" AS ENUM ('WOULD_CREATE', 'WOULD_UPDATE', 'WOULD_SKIP', 'MATCHED', 'FAILED');

-- CreateEnum
CREATE TYPE "MatchStrategy" AS ENUM ('EXTERNAL_MAPPING', 'CPF', 'NAME_CONTACT_BIRTHDATE', 'NONE');

-- CreateEnum
CREATE TYPE "ImportSeverity" AS ENUM ('INFO', 'WARNING', 'CONFLICT', 'ERROR');

-- AlterTable
ALTER TABLE "ImportBatch" ADD COLUMN     "conflicts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mode" "ImportMode" NOT NULL DEFAULT 'DRY_RUN',
ADD COLUMN     "sourceFileHash" TEXT,
ADD COLUMN     "warnings" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ImportBatchItem" ADD COLUMN     "errorsJson" JSONB,
ADD COLUMN     "externalType" TEXT,
ADD COLUMN     "matchStrategy" "MatchStrategy",
ADD COLUMN     "normalizedJson" JSONB,
ADD COLUMN     "operation" "ImportOperation",
ADD COLUMN     "severity" "ImportSeverity",
ADD COLUMN     "targetId" TEXT,
ADD COLUMN     "targetType" TEXT,
ADD COLUMN     "warningsJson" JSONB;
