-- AlterTable
ALTER TABLE "scd_billing_transactions" ADD COLUMN     "razorpay_order_id" VARCHAR(50),
ADD COLUMN     "razorpay_payment_id" VARCHAR(50);

-- CreateIndex
CREATE INDEX "scd_billing_transactions_razorpay_transfer_id_idx" ON "scd_billing_transactions"("razorpay_transfer_id");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_razorpay_payment_id_idx" ON "scd_billing_transactions"("razorpay_payment_id");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_razorpay_order_id_idx" ON "scd_billing_transactions"("razorpay_order_id");

-- Backfill from the deprecated meta JSON so existing rows can refund/reconcile
UPDATE "scd_billing_transactions"
SET
  "razorpay_payment_id" = CASE
    WHEN length(trim("meta" ->> 'razorpay_payment_id')) BETWEEN 1 AND 50
      THEN trim("meta" ->> 'razorpay_payment_id')
  END,
  "razorpay_order_id" = CASE
    WHEN length(trim("meta" ->> 'razorpay_order_id')) BETWEEN 1 AND 50
      THEN trim("meta" ->> 'razorpay_order_id')
  END
WHERE "meta" IS NOT NULL AND jsonb_typeof("meta") = 'object';
