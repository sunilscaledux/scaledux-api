-- AlterTable
ALTER TABLE "public"."identity_verifications" ADD COLUMN     "address_proof_urls" JSONB,
ADD COLUMN     "document_date_issued" TIMESTAMP(3),
ADD COLUMN     "document_type" TEXT,
ADD COLUMN     "institution_name" TEXT;
