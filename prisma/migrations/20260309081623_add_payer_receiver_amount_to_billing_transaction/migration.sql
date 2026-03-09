-- AlterTable
ALTER TABLE "public"."scd_billing_transactions" ADD COLUMN     "payer_amount" DECIMAL(10,2),
ADD COLUMN     "receiver_amount" DECIMAL(10,2);
