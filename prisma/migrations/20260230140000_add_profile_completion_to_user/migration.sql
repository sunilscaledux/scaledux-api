-- AlterTable
ALTER TABLE "scd_users" ADD COLUMN IF NOT EXISTS "profile_completion_sections" JSONB,
ADD COLUMN IF NOT EXISTS "profile_completion_percentage" INTEGER;
