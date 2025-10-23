/*
  Warnings:

  - Made the column `availability_id` on table `Appointment` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_availability_id_fkey";

-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "availability_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_availability_id_fkey" FOREIGN KEY ("availability_id") REFERENCES "Availability"("availability_id") ON DELETE RESTRICT ON UPDATE CASCADE;
