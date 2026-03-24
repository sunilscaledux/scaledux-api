-- Add tier label columns to service packages
ALTER TABLE "scd_service_packages" ADD COLUMN "basic_label" VARCHAR(50) DEFAULT 'Basic';
ALTER TABLE "scd_service_packages" ADD COLUMN "standard_label" VARCHAR(50) DEFAULT 'Standard';
ALTER TABLE "scd_service_packages" ADD COLUMN "premium_label" VARCHAR(50) DEFAULT 'Premium';
