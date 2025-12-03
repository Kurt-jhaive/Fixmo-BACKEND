-- CreateTable
CREATE TABLE IF NOT EXISTS "DiditVerification" (
    "id" SERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "document_number" TEXT,
    "document_type" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "date_of_birth" TEXT,
    "document_country" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "user_id" INTEGER,
    "provider_id" INTEGER,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiditVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DiditVerification_session_id_key" ON "DiditVerification"("session_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiditVerification_email_idx" ON "DiditVerification"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiditVerification_document_number_idx" ON "DiditVerification"("document_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiditVerification_status_idx" ON "DiditVerification"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiditVerification_user_id_idx" ON "DiditVerification"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiditVerification_provider_id_idx" ON "DiditVerification"("provider_id");
