-- Simplify scd_identity_verifications: remove old form columns, add verification_type + meta_data

-- Add new columns
ALTER TABLE "scd_identity_verifications" ADD COLUMN "verification_type" TEXT NOT NULL DEFAULT 'aadhaar';
ALTER TABLE "scd_identity_verifications" ADD COLUMN "meta_data" JSONB;

-- Drop old form-based columns that are no longer needed
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "first_name";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "middle_name";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "last_name";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "date_of_birth";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "nationality";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "id_type";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "id_number";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "id_expiry_date";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "issuing_country";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "id_document_urls";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "keycode";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "selfie_urls";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "address_line_1";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "address_line_2";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "city";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "state";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "postal_code";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "address_country";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "proof_of_address_consent";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "address_proof_urls";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "document_type";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "institution_name";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "document_date_issued";
ALTER TABLE "scd_identity_verifications" DROP COLUMN IF EXISTS "verified_by";
