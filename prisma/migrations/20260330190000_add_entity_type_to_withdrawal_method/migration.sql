-- Rename table from scd_withdrawal_methods to scd_bank_information
ALTER TABLE "scd_withdrawal_methods" RENAME TO "scd_bank_information";

-- Add new columns
ALTER TABLE "scd_bank_information"
ADD COLUMN "entity_type" VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL',
ADD COLUMN "account_holder_name" VARCHAR(200),
ADD COLUMN "verified_at" TIMESTAMP;

-- Drop old unique constraint on user_id (was one-per-user, now one-per-user-per-entity_type)
ALTER TABLE "scd_bank_information" DROP CONSTRAINT IF EXISTS "scd_withdrawal_methods_user_id_key";

-- Add new unique constraint: one record per user per entity_type
ALTER TABLE "scd_bank_information" ADD CONSTRAINT "scd_bank_information_user_id_entity_type_key" UNIQUE ("user_id", "entity_type");
