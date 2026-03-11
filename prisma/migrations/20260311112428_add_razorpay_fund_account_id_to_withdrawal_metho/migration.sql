/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `scd_withdrawal_methods` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."scd_withdrawal_methods_is_default_idx";

-- AlterTable
ALTER TABLE "public"."scd_users" ADD COLUMN     "razorpay_account_id" VARCHAR(64);

-- AlterTable
ALTER TABLE "public"."scd_withdrawal_methods" ADD COLUMN     "razorpay_fund_account_id" VARCHAR(64),
ADD COLUMN     "verification_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
ALTER COLUMN "type" SET DEFAULT 'bank_account',
ALTER COLUMN "is_default" SET DEFAULT true;

-- CreateTable
CREATE TABLE "public"."scd_withdrawal_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "withdrawal_method_id" INTEGER NOT NULL,
    "billing_transaction_id" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "withdrawal_trigger_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "error_message" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_withdrawal_requests_billing_transaction_id_key" ON "public"."scd_withdrawal_requests"("billing_transaction_id");

-- CreateIndex
CREATE INDEX "scd_withdrawal_requests_status_idx" ON "public"."scd_withdrawal_requests"("status");

-- CreateIndex
CREATE INDEX "scd_withdrawal_requests_withdrawal_trigger_at_idx" ON "public"."scd_withdrawal_requests"("withdrawal_trigger_at");

-- CreateIndex
CREATE UNIQUE INDEX "scd_withdrawal_methods_user_id_key" ON "public"."scd_withdrawal_methods"("user_id");

-- CreateIndex
CREATE INDEX "scd_withdrawal_methods_verification_status_idx" ON "public"."scd_withdrawal_methods"("verification_status");

-- AddForeignKey
ALTER TABLE "public"."scd_withdrawal_requests" ADD CONSTRAINT "scd_withdrawal_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_withdrawal_requests" ADD CONSTRAINT "scd_withdrawal_requests_withdrawal_method_id_fkey" FOREIGN KEY ("withdrawal_method_id") REFERENCES "public"."scd_withdrawal_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_withdrawal_requests" ADD CONSTRAINT "scd_withdrawal_requests_billing_transaction_id_fkey" FOREIGN KEY ("billing_transaction_id") REFERENCES "public"."scd_billing_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
