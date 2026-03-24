-- Migrate revenue models from ID-based to JSON

-- Add new JSON column
ALTER TABLE "scd_company_profiles" ADD COLUMN "revenue_models" JSONB;

-- Migrate existing data: convert IDs to JSON with model names
UPDATE "scd_company_profiles" cp
SET "revenue_models" = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', rm.name,
      'is_primary', CASE WHEN rm.id = cp.primary_revenue_model_id THEN true ELSE false END,
      'is_secondary', CASE WHEN rm.id = ANY(cp.secondary_revenue_model_ids) THEN true ELSE false END
    )
  )
  FROM "scd_revenue_models" rm
  WHERE rm.id = ANY(cp.revenue_model_ids)
)
WHERE array_length(cp.revenue_model_ids, 1) > 0;

-- Drop old columns
ALTER TABLE "scd_company_profiles" DROP COLUMN "revenue_model_ids";
ALTER TABLE "scd_company_profiles" DROP COLUMN "primary_revenue_model_id";
ALTER TABLE "scd_company_profiles" DROP COLUMN "secondary_revenue_model_ids";

-- Drop revenue models table
DROP TABLE IF EXISTS "scd_revenue_models";
