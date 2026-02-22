-- AlterTable: ensure milestone completion status column exists on scd_milestones
-- status: PENDING, IN_PROGRESS, COMPLETED, PAID (used as milestone_status in API/UI)
ALTER TABLE "scd_milestones" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING';
