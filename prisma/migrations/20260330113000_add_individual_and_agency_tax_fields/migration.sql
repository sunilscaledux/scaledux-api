ALTER TABLE "scd_tax_information"
ADD COLUMN "individual_pan" VARCHAR(10),
ADD COLUMN "individual_gstin" VARCHAR(15),
ADD COLUMN "agency_pan" VARCHAR(10),
ADD COLUMN "agency_gstin" VARCHAR(15);

UPDATE "scd_tax_information"
SET
  "individual_pan" = COALESCE("individual_pan", "pan_number"),
  "individual_gstin" = COALESCE("individual_gstin", CASE WHEN "entity_type" <> 'AGENCY' THEN "gstin" ELSE NULL END),
  "agency_pan" = COALESCE("agency_pan", CASE WHEN "entity_type" = 'AGENCY' THEN "pan_number" ELSE NULL END),
  "agency_gstin" = COALESCE("agency_gstin", CASE WHEN "entity_type" = 'AGENCY' THEN "gstin" ELSE NULL END);
