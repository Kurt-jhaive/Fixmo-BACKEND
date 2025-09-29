-- AlterTable
ALTER TABLE "public"."Appointment" ADD COLUMN     "warranty_paused_at" TIMESTAMP(3),
ADD COLUMN     "warranty_remaining_days" INTEGER;
