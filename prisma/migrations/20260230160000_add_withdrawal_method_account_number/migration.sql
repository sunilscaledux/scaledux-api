-- AlterTable
ALTER TABLE "scd_withdrawal_methods" ADD COLUMN IF NOT EXISTS "account_number" VARCHAR(34);
