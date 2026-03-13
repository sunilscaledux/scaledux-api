-- Add main_reason column: stores predefined reason key (e.g. BUDGET_MISMATCH, OTHER) from proposal reasons.
ALTER TABLE "scd_proposals" ADD COLUMN IF NOT EXISTS "main_reason" VARCHAR(50);
