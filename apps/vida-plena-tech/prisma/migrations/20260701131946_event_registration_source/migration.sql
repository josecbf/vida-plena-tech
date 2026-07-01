-- AlterTable
ALTER TABLE "EventRegistration" ADD COLUMN     "metaJson" JSONB,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "sourcePaymentJson" JSONB,
ADD COLUMN     "sourceRegisteredAt" TIMESTAMP(3);
