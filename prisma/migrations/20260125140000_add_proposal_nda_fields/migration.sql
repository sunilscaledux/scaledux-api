-- AlterTable
ALTER TABLE "scd_proposals" ADD COLUMN IF NOT EXISTS "is_nda_signed" BOOLEAN DEFAULT false;
ALTER TABLE "scd_proposals" ADD COLUMN IF NOT EXISTS "nda_file_link" TEXT;
ALTER TABLE "scd_proposals" ADD COLUMN IF NOT EXISTS "nda_sent_at" TIMESTAMP(3);
ALTER TABLE "scd_proposals" ADD COLUMN IF NOT EXISTS "nda_signed_at" TIMESTAMP(3);
