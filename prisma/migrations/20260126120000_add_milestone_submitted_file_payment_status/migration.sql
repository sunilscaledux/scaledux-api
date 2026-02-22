-- AlterTable
ALTER TABLE "scd_milestones" ADD COLUMN IF NOT EXISTS "submitted_file" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "scd_milestones" ADD COLUMN IF NOT EXISTS "payment_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING';
