-- AlterTable: add dob (yyyy-MM-dd string) and gender to users.
ALTER TABLE "scd_users" ADD COLUMN IF NOT EXISTS "dob"    VARCHAR(10);
ALTER TABLE "scd_users" ADD COLUMN IF NOT EXISTS "gender" VARCHAR(16);
