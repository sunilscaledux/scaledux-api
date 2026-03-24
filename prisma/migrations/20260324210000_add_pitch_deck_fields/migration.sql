-- Add pitch deck fields to company profiles
ALTER TABLE "scd_company_profiles" ADD COLUMN "founders_video_url" TEXT;
ALTER TABLE "scd_company_profiles" ADD COLUMN "cap_table_url" TEXT;
ALTER TABLE "scd_company_profiles" ADD COLUMN "cap_table_file" TEXT;
ALTER TABLE "scd_company_profiles" ADD COLUMN "product_demo_url" TEXT;
