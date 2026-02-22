-- Add feedback column: only if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scd_deliverables') THEN
    ALTER TABLE "scd_deliverables" ADD COLUMN IF NOT EXISTS "feedback" TEXT;
  END IF;
END $$;
