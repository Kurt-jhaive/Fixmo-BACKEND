-- CreateTable
CREATE TABLE "public"."BackjobApplication" (
    "backjob_id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT NOT NULL,
    "evidence" JSONB,
    "provider_dispute_reason" TEXT,
    "provider_dispute_evidence" JSONB,
    "admin_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackjobApplication_pkey" PRIMARY KEY ("backjob_id")
);

-- CreateIndex
CREATE INDEX "BackjobApplication_appointment_id_idx" ON "public"."BackjobApplication"("appointment_id");

-- AddForeignKey
ALTER TABLE "public"."BackjobApplication" ADD CONSTRAINT "BackjobApplication_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."Appointment"("appointment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BackjobApplication" ADD CONSTRAINT "BackjobApplication_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BackjobApplication" ADD CONSTRAINT "BackjobApplication_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."ServiceProviderDetails"("provider_id") ON DELETE RESTRICT ON UPDATE CASCADE;
