-- AlterTable
ALTER TABLE "public"."Certificate" ADD COLUMN     "certificate_reason" TEXT;

-- AlterTable
ALTER TABLE "public"."ServiceProviderDetails" ADD COLUMN     "provider_reason" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "user_reason" TEXT;
