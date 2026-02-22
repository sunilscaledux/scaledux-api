-- AlterTable: only if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scd_proposals') THEN
    ALTER TABLE "scd_proposals" ADD COLUMN IF NOT EXISTS "nda_signed_file_link" TEXT;
  END IF;
END $$;
