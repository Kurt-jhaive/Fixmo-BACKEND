-- AlterTable
ALTER TABLE "public"."ServiceProviderDetails" ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "verification_reviewed_at" TIMESTAMP(3),
ADD COLUMN     "verification_status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "verification_submitted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "verification_reviewed_at" TIMESTAMP(3),
ADD COLUMN     "verification_status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "verification_submitted_at" TIMESTAMP(3);
