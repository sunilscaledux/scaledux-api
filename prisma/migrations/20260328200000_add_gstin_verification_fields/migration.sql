-- Add GSTIN verification fields to TaxInformation
ALTER TABLE "scd_tax_information" ADD COLUMN "individual_gstin_status" VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE "scd_tax_information" ADD COLUMN "individual_gstin_verified_at" TIMESTAMP;
ALTER TABLE "scd_tax_information" ADD COLUMN "individual_gstin_failure_reason" VARCHAR(500);
ALTER TABLE "scd_tax_information" ADD COLUMN "individual_gstin_api_response" JSONB;
ALTER TABLE "scd_tax_information" ADD COLUMN "agency_gstin_status" VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE "scd_tax_information" ADD COLUMN "agency_gstin_verified_at" TIMESTAMP;
ALTER TABLE "scd_tax_information" ADD COLUMN "agency_gstin_failure_reason" VARCHAR(500);
ALTER TABLE "scd_tax_information" ADD COLUMN "agency_gstin_api_response" JSONB;
