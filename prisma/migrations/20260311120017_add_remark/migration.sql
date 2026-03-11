/*
  Warnings:

  - You are about to drop the column `is_default` on the `scd_withdrawal_methods` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."scd_users" ADD COLUMN     "razorpay_contact_id" VARCHAR(64);

-- AlterTable
ALTER TABLE "public"."scd_withdrawal_methods" DROP COLUMN "is_default",
ADD COLUMN     "verification_failure_reason" VARCHAR(500);
