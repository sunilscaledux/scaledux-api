-- AlterTable (only if table exists; shadow DB may not have it if created via db push)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scd_investor_portfolios') THEN
    ALTER TABLE "scd_investor_portfolios" ADD COLUMN IF NOT EXISTS "investment_size_currency" TEXT;
  END IF;
END $$;
