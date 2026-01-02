/*
  Warnings:

  - You are about to drop the column `billing_address` on the `scd_payment_methods` table. All the data in the column will be lost.
  - You are about to drop the column `encrypted_card_number` on the `scd_payment_methods` table. All the data in the column will be lost.
  - You are about to drop the column `expiry_date` on the `scd_payment_methods` table. All the data in the column will be lost.
  - You are about to drop the column `paypal_account_id` on the `scd_payment_methods` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."scd_payment_methods" DROP COLUMN "billing_address",
DROP COLUMN "encrypted_card_number",
DROP COLUMN "expiry_date",
DROP COLUMN "paypal_account_id",
ADD COLUMN     "card_brand" VARCHAR(50),
ADD COLUMN     "expiry_month" VARCHAR(2),
ADD COLUMN     "expiry_year" VARCHAR(4),
ADD COLUMN     "is_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paypal_payer_id" VARCHAR(255),
ADD COLUMN     "razorpay_customer_id" VARCHAR(255),
ADD COLUMN     "razorpay_payment_id" VARCHAR(255),
ADD COLUMN     "verification_amount" DECIMAL(10,2),
ADD COLUMN     "verified_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "scd_payment_methods_razorpay_customer_id_idx" ON "public"."scd_payment_methods"("razorpay_customer_id");
