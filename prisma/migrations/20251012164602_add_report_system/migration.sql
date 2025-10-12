-- CreateTable
CREATE TABLE "Report" (
    "report_id" SERIAL NOT NULL,
    "reporter_name" TEXT NOT NULL,
    "reporter_email" TEXT NOT NULL,
    "reporter_phone" TEXT,
    "reporter_type" TEXT,
    "user_id" INTEGER,
    "report_type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "attachment_urls" JSONB,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "admin_notes" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("report_id")
);

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_report_type_idx" ON "Report"("report_type");

-- CreateIndex
CREATE INDEX "Report_reporter_email_idx" ON "Report"("reporter_email");
