-- AlterTable
ALTER TABLE "public"."Appointment" ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "finished_at" TIMESTAMP(3),
ADD COLUMN     "warranty_days" INTEGER,
ADD COLUMN     "warranty_expires_at" TIMESTAMP(3);
