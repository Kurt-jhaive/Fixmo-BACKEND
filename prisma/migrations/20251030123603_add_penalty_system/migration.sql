-- AlterTable
ALTER TABLE "ServiceProviderDetails" ADD COLUMN     "is_suspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "penalty_points" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "suspended_at" TIMESTAMP(3),
ADD COLUMN     "suspended_until" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "is_suspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "penalty_points" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "suspended_at" TIMESTAMP(3),
ADD COLUMN     "suspended_until" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ViolationType" (
    "violation_type_id" SERIAL NOT NULL,
    "violation_code" TEXT NOT NULL,
    "violation_name" TEXT NOT NULL,
    "violation_category" TEXT NOT NULL,
    "penalty_points" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "requires_evidence" BOOLEAN NOT NULL DEFAULT false,
    "auto_detect" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ViolationType_pkey" PRIMARY KEY ("violation_type_id")
);

-- CreateTable
CREATE TABLE "PenaltyViolation" (
    "violation_id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "provider_id" INTEGER,
    "violation_type_id" INTEGER NOT NULL,
    "appointment_id" INTEGER,
    "report_id" INTEGER,
    "rating_id" INTEGER,
    "points_deducted" INTEGER NOT NULL,
    "violation_details" TEXT,
    "evidence_urls" JSONB,
    "detected_by" TEXT NOT NULL DEFAULT 'system',
    "detected_by_admin_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "appeal_reason" TEXT,
    "appeal_status" TEXT,
    "appeal_reviewed_by" INTEGER,
    "appeal_reviewed_at" TIMESTAMP(3),
    "reversed_at" TIMESTAMP(3),
    "reversed_by_admin_id" INTEGER,
    "reversal_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "PenaltyViolation_pkey" PRIMARY KEY ("violation_id")
);

-- CreateTable
CREATE TABLE "PenaltyAdjustment" (
    "adjustment_id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "provider_id" INTEGER,
    "adjustment_type" TEXT NOT NULL,
    "points_adjusted" INTEGER NOT NULL,
    "previous_points" INTEGER NOT NULL,
    "new_points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "adjusted_by_admin_id" INTEGER,
    "related_violation_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PenaltyAdjustment_pkey" PRIMARY KEY ("adjustment_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ViolationType_violation_code_key" ON "ViolationType"("violation_code");

-- CreateIndex
CREATE INDEX "ViolationType_violation_category_is_active_idx" ON "ViolationType"("violation_category", "is_active");

-- CreateIndex
CREATE INDEX "ViolationType_violation_code_idx" ON "ViolationType"("violation_code");

-- CreateIndex
CREATE INDEX "PenaltyViolation_user_id_status_idx" ON "PenaltyViolation"("user_id", "status");

-- CreateIndex
CREATE INDEX "PenaltyViolation_provider_id_status_idx" ON "PenaltyViolation"("provider_id", "status");

-- CreateIndex
CREATE INDEX "PenaltyViolation_violation_type_id_idx" ON "PenaltyViolation"("violation_type_id");

-- CreateIndex
CREATE INDEX "PenaltyViolation_created_at_idx" ON "PenaltyViolation"("created_at");

-- CreateIndex
CREATE INDEX "PenaltyAdjustment_user_id_idx" ON "PenaltyAdjustment"("user_id");

-- CreateIndex
CREATE INDEX "PenaltyAdjustment_provider_id_idx" ON "PenaltyAdjustment"("provider_id");

-- CreateIndex
CREATE INDEX "PenaltyAdjustment_adjustment_type_idx" ON "PenaltyAdjustment"("adjustment_type");

-- CreateIndex
CREATE INDEX "PenaltyAdjustment_created_at_idx" ON "PenaltyAdjustment"("created_at");

-- AddForeignKey
ALTER TABLE "PenaltyViolation" ADD CONSTRAINT "PenaltyViolation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyViolation" ADD CONSTRAINT "PenaltyViolation_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ServiceProviderDetails"("provider_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyViolation" ADD CONSTRAINT "PenaltyViolation_violation_type_id_fkey" FOREIGN KEY ("violation_type_id") REFERENCES "ViolationType"("violation_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;
