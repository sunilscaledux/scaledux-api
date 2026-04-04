/*
  Warnings:

  - The values [held,releasing,settled] on the enum `BillingTransactionReceiverStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [held,releasing,settled] on the enum `BillingTransactionStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `cic_amount` on the `scd_billing_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `commission_amount` on the `scd_billing_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `gst_on_fees` on the `scd_billing_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `invoice_a_id` on the `scd_billing_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `invoice_b_id` on the `scd_billing_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `invoice_c_id` on the `scd_billing_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `platform_fee_amount` on the `scd_billing_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `razorpay_order_id` on the `scd_billing_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `razorpay_payment_id` on the `scd_billing_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `razorpay_settlement_id` on the `scd_billing_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `razorpay_transfer_id` on the `scd_billing_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `tcs_amount` on the `scd_billing_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `freelancer_gstin` on the `scd_invoices` table. All the data in the column will be lost.
  - You are about to drop the column `invoice_type` on the `scd_invoices` table. All the data in the column will be lost.
  - You are about to drop the column `is_tax_invoice` on the `scd_invoices` table. All the data in the column will be lost.
  - You are about to drop the column `line_items` on the `scd_invoices` table. All the data in the column will be lost.
  - You are about to drop the column `tcs_amount` on the `scd_invoices` table. All the data in the column will be lost.
  - You are about to drop the column `total_amount` on the `scd_invoices` table. All the data in the column will be lost.
  - You are about to drop the column `razorpay_transfer_id` on the `scd_milestones` table. All the data in the column will be lost.
  - You are about to drop the column `settled_at` on the `scd_milestones` table. All the data in the column will be lost.
  - You are about to drop the column `settlement_utr` on the `scd_milestones` table. All the data in the column will be lost.
  - You are about to drop the column `razorpay_route_account_id` on the `scd_users` table. All the data in the column will be lost.
  - You are about to drop the column `razorpay_route_account_status` on the `scd_users` table. All the data in the column will be lost.
  - You are about to drop the `scd_invoice_sequences` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."BillingTransactionReceiverStatus_new" AS ENUM ('pending', 'completed', 'released', 'withdraw_in_process', 'paid_out');
ALTER TABLE "public"."scd_billing_transactions" ALTER COLUMN "receiver_status" TYPE "public"."BillingTransactionReceiverStatus_new" USING ("receiver_status"::text::"public"."BillingTransactionReceiverStatus_new");
ALTER TYPE "public"."BillingTransactionReceiverStatus" RENAME TO "BillingTransactionReceiverStatus_old";
ALTER TYPE "public"."BillingTransactionReceiverStatus_new" RENAME TO "BillingTransactionReceiverStatus";
DROP TYPE "public"."BillingTransactionReceiverStatus_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."BillingTransactionStatus_new" AS ENUM ('pending', 'completed', 'failed');
ALTER TABLE "public"."scd_billing_transactions" ALTER COLUMN "status" TYPE "public"."BillingTransactionStatus_new" USING ("status"::text::"public"."BillingTransactionStatus_new");
ALTER TYPE "public"."BillingTransactionStatus" RENAME TO "BillingTransactionStatus_old";
ALTER TYPE "public"."BillingTransactionStatus_new" RENAME TO "BillingTransactionStatus";
DROP TYPE "public"."BillingTransactionStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."scd_billing_transactions" DROP CONSTRAINT "scd_billing_transactions_invoice_a_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scd_billing_transactions" DROP CONSTRAINT "scd_billing_transactions_invoice_b_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scd_billing_transactions" DROP CONSTRAINT "scd_billing_transactions_invoice_c_id_fkey";

-- DropIndex
DROP INDEX "public"."scd_billing_transactions_invoice_a_id_key";

-- DropIndex
DROP INDEX "public"."scd_billing_transactions_invoice_b_id_key";

-- DropIndex
DROP INDEX "public"."scd_billing_transactions_invoice_c_id_key";

-- DropIndex
DROP INDEX "public"."scd_invoices_invoice_type_idx";

-- AlterTable
ALTER TABLE "public"."scd_billing_transactions" DROP COLUMN "cic_amount",
DROP COLUMN "commission_amount",
DROP COLUMN "gst_on_fees",
DROP COLUMN "invoice_a_id",
DROP COLUMN "invoice_b_id",
DROP COLUMN "invoice_c_id",
DROP COLUMN "platform_fee_amount",
DROP COLUMN "razorpay_order_id",
DROP COLUMN "razorpay_payment_id",
DROP COLUMN "razorpay_settlement_id",
DROP COLUMN "razorpay_transfer_id",
DROP COLUMN "tcs_amount";

-- AlterTable
ALTER TABLE "public"."scd_invoices" DROP COLUMN "freelancer_gstin",
DROP COLUMN "invoice_type",
DROP COLUMN "is_tax_invoice",
DROP COLUMN "line_items",
DROP COLUMN "tcs_amount",
DROP COLUMN "total_amount";

-- AlterTable
ALTER TABLE "public"."scd_milestones" DROP COLUMN "razorpay_transfer_id",
DROP COLUMN "settled_at",
DROP COLUMN "settlement_utr";

-- AlterTable
ALTER TABLE "public"."scd_users" DROP COLUMN "razorpay_route_account_id",
DROP COLUMN "razorpay_route_account_status";

-- DropTable
DROP TABLE "public"."scd_invoice_sequences";
