-- AlterTable: store the Razorpay Route product id (acc_prd_xxx) so activation status is
-- read from the product (activation_status), not the account (status). IF NOT EXISTS keeps it idempotent.
ALTER TABLE "scd_bank_information" ADD COLUMN IF NOT EXISTS "razorpay_product_id" VARCHAR(64);
