-- Add new fields to raising funds table
ALTER TABLE "scd_raising_funds" ADD COLUMN "funding_stage" TEXT;
ALTER TABLE "scd_raising_funds" ADD COLUMN "expected_close_date" TEXT;
ALTER TABLE "scd_raising_funds" ADD COLUMN "valuation_min" DECIMAL(15, 2);
ALTER TABLE "scd_raising_funds" ADD COLUMN "valuation_max" DECIMAL(15, 2);
ALTER TABLE "scd_raising_funds" ADD COLUMN "has_committed" BOOLEAN DEFAULT false;
ALTER TABLE "scd_raising_funds" ADD COLUMN "committed_amount" DECIMAL(15, 2);
ALTER TABLE "scd_raising_funds" ADD COLUMN "committed_investor" TEXT;
