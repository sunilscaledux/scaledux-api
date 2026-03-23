-- Add specialty_ids JSON column
ALTER TABLE "scd_user_expertises" ADD COLUMN "specialty_ids" JSONB;

-- Migrate existing data: convert single specialty_id to JSON array
UPDATE "scd_user_expertises"
SET "specialty_ids" = jsonb_build_array("specialty_id")
WHERE "specialty_id" IS NOT NULL;

-- Drop old foreign key and column
ALTER TABLE "scd_user_expertises" DROP CONSTRAINT IF EXISTS "scd_user_expertises_specialty_id_fkey";
ALTER TABLE "scd_user_expertises" DROP COLUMN "specialty_id";
