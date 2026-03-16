/*
  Warnings:

  - Changed the type of `type` on the `scd_billing_transactions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `scd_billing_transactions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."BillingTransactionType" AS ENUM ('payment', 'refund', 'withdrawal');

-- CreateEnum
CREATE TYPE "public"."BillingTransactionStatus" AS ENUM ('pending', 'completed', 'failed');

-- AlterTable
ALTER TABLE "public"."scd_billing_transactions" DROP COLUMN "type",
ADD COLUMN     "type" "public"."BillingTransactionType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."BillingTransactionStatus" NOT NULL;

-- CreateIndex
CREATE INDEX "scd_billing_transactions_status_idx" ON "public"."scd_billing_transactions"("status");
