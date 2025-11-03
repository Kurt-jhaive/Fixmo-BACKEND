-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_availability_id_fkey";

-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "availability_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_availability_id_fkey" FOREIGN KEY ("availability_id") REFERENCES "Availability"("availability_id") ON DELETE SET NULL ON UPDATE CASCADE;
