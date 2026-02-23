-- AlterTable
ALTER TABLE "public"."scd_deliverables" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ;
