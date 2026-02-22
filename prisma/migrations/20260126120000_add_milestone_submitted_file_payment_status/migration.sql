-- AlterTable: only if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scd_milestones') THEN
    ALTER TABLE "scd_milestones" ADD COLUMN IF NOT EXISTS "submitted_file" JSONB NOT NULL DEFAULT '[]';
    ALTER TABLE "scd_milestones" ADD COLUMN IF NOT EXISTS "payment_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING';
  END IF;
END $$;
