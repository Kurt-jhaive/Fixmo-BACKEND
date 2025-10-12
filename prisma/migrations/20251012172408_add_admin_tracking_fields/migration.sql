-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "cancelled_by_admin_id" INTEGER;

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by_admin_id" INTEGER;

-- AlterTable
ALTER TABLE "ServiceProviderDetails" ADD COLUMN     "deactivated_by_admin_id" INTEGER,
ADD COLUMN     "verified_by_admin_id" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deactivated_by_admin_id" INTEGER,
ADD COLUMN     "verified_by_admin_id" INTEGER;
