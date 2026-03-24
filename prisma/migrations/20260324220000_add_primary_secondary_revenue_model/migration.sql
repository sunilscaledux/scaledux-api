-- Add primary and secondary revenue model fields
ALTER TABLE "scd_company_profiles" ADD COLUMN "primary_revenue_model_id" INTEGER;
ALTER TABLE "scd_company_profiles" ADD COLUMN "secondary_revenue_model_ids" INTEGER[] DEFAULT '{}';
