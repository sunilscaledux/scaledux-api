-- AlterTable
ALTER TABLE "scd_identity_verifications" ADD COLUMN "middle_name" TEXT;

-- AlterTable
ALTER TABLE "scd_users" ADD COLUMN "middle_name" TEXT;

-- Rename reviewed_at/reviewed_by to verified_at/verified_by in identity_verifications
ALTER TABLE "scd_identity_verifications" RENAME COLUMN "reviewed_at" TO "verified_at";
ALTER TABLE "scd_identity_verifications" RENAME COLUMN "reviewed_by" TO "verified_by";

-- Rename reviewed_by to verified_by in agency_verifications
ALTER TABLE "scd_agency_verifications" RENAME COLUMN "reviewed_by" TO "verified_by";
