/*
  Warnings:

  - You are about to drop the column `milestones` on the `scd_proposals` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."scd_proposals" DROP COLUMN "milestones";

-- AlterTable
ALTER TABLE "public"."scd_users" ALTER COLUMN "total_earning" SET DEFAULT 0,
ALTER COLUMN "total_withdrawal" SET DEFAULT 0,
ALTER COLUMN "wallet_amount" SET DEFAULT 0,
ALTER COLUMN "pending_amount" SET DEFAULT 0;
