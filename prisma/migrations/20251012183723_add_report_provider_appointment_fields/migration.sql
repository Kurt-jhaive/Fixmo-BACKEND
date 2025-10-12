-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "appointment_id" INTEGER,
ADD COLUMN     "provider_id" INTEGER;

-- CreateIndex
CREATE INDEX "Report_provider_id_idx" ON "Report"("provider_id");

-- CreateIndex
CREATE INDEX "Report_appointment_id_idx" ON "Report"("appointment_id");
