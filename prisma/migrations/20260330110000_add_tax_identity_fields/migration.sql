ALTER TABLE "scd_tax_information"
ADD COLUMN "entity_type" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
ADD COLUMN "pan_number" VARCHAR(10);
