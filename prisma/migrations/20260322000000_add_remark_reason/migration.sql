-- AlterTable: add remark_reason to scd_proposals (predefined reason key for decline/withdraw/terminate)
ALTER TABLE "scd_proposals" ADD COLUMN IF NOT EXISTS "remark_reason" VARCHAR(50);
