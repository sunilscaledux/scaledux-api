/*
  Warnings:

  - You are about to drop the column `expertise_category_id` on the `scd_service_packages` table. All the data in the column will be lost.
  - You are about to drop the column `specialty_id` on the `scd_service_packages` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[invoice_c_id]` on the table `scd_billing_transactions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invoice_a_id]` on the table `scd_billing_transactions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invoice_b_id]` on the table `scd_billing_transactions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `category_id` to the `scd_service_packages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."BillingTransactionReceiverStatus" ADD VALUE 'held';
ALTER TYPE "public"."BillingTransactionReceiverStatus" ADD VALUE 'releasing';
ALTER TYPE "public"."BillingTransactionReceiverStatus" ADD VALUE 'settled';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."BillingTransactionStatus" ADD VALUE 'held';
ALTER TYPE "public"."BillingTransactionStatus" ADD VALUE 'releasing';
ALTER TYPE "public"."BillingTransactionStatus" ADD VALUE 'settled';

-- DropForeignKey
ALTER TABLE "public"."scd_service_packages" DROP CONSTRAINT "scd_service_packages_expertise_category_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scd_service_packages" DROP CONSTRAINT "scd_service_packages_specialty_id_fkey";

-- DropIndex
DROP INDEX "public"."scd_withdrawal_methods_user_id_key";

-- DropIndex
DROP INDEX "public"."scd_service_packages_expertise_category_id_idx";

-- DropIndex
DROP INDEX "public"."scd_service_packages_specialty_id_idx";

-- AlterTable
ALTER TABLE "public"."scd_bank_information" RENAME CONSTRAINT "scd_withdrawal_methods_pkey" TO "scd_bank_information_pkey";
ALTER TABLE "public"."scd_bank_information" ALTER COLUMN "verified_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."scd_billing_transactions" ADD COLUMN     "cic_amount" DECIMAL(10,2),
ADD COLUMN     "commission_amount" DECIMAL(10,2),
ADD COLUMN     "gst_on_fees" DECIMAL(10,2),
ADD COLUMN     "invoice_a_id" INTEGER,
ADD COLUMN     "invoice_b_id" INTEGER,
ADD COLUMN     "invoice_c_id" INTEGER,
ADD COLUMN     "platform_fee_amount" DECIMAL(10,2),
ADD COLUMN     "razorpay_order_id" VARCHAR(64),
ADD COLUMN     "razorpay_payment_id" VARCHAR(64),
ADD COLUMN     "razorpay_settlement_id" VARCHAR(64),
ADD COLUMN     "razorpay_transfer_id" VARCHAR(64),
ADD COLUMN     "tcs_amount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "public"."scd_identity_verifications" ALTER COLUMN "verification_type" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."scd_invoices" ADD COLUMN     "freelancer_gstin" VARCHAR(15),
ADD COLUMN     "invoice_type" VARCHAR(10),
ADD COLUMN     "is_tax_invoice" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "line_items" JSONB,
ADD COLUMN     "tcs_amount" DECIMAL(10,2),
ADD COLUMN     "total_amount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "public"."scd_milestones" ADD COLUMN     "razorpay_transfer_id" VARCHAR(64),
ADD COLUMN     "settled_at" TIMESTAMP(3),
ADD COLUMN     "settlement_utr" VARCHAR(64);

-- AlterTable
ALTER TABLE "public"."scd_service_packages" DROP COLUMN "expertise_category_id",
DROP COLUMN "specialty_id",
ADD COLUMN     "category_id" INTEGER NOT NULL,
ADD COLUMN     "sub_category_id" INTEGER;

-- AlterTable
ALTER TABLE "public"."scd_tax_information" ALTER COLUMN "individual_gstin_verified_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "agency_gstin_verified_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."scd_users" ADD COLUMN     "razorpay_route_account_id" VARCHAR(64),
ADD COLUMN     "razorpay_route_account_status" VARCHAR(20) DEFAULT 'none';

-- CreateTable
CREATE TABLE "public"."scd_invoice_sequences" (
    "id" SERIAL NOT NULL,
    "invoice_type" VARCHAR(10) NOT NULL,
    "financial_year" VARCHAR(10) NOT NULL,
    "last_sequence" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_invoice_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_invoice_sequences_invoice_type_financial_year_key" ON "public"."scd_invoice_sequences"("invoice_type", "financial_year");

-- CreateIndex
CREATE UNIQUE INDEX "scd_billing_transactions_invoice_c_id_key" ON "public"."scd_billing_transactions"("invoice_c_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_billing_transactions_invoice_a_id_key" ON "public"."scd_billing_transactions"("invoice_a_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_billing_transactions_invoice_b_id_key" ON "public"."scd_billing_transactions"("invoice_b_id");

-- CreateIndex
CREATE INDEX "scd_invoices_invoice_type_idx" ON "public"."scd_invoices"("invoice_type");

-- CreateIndex
CREATE INDEX "scd_service_packages_category_id_idx" ON "public"."scd_service_packages"("category_id");

-- CreateIndex
CREATE INDEX "scd_service_packages_sub_category_id_idx" ON "public"."scd_service_packages"("sub_category_id");

-- RenameForeignKey
ALTER TABLE "public"."scd_bank_information" RENAME CONSTRAINT "scd_withdrawal_methods_user_id_fkey" TO "scd_bank_information_user_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."scd_service_packages" ADD CONSTRAINT "scd_service_packages_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."scd_expertise_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_service_packages" ADD CONSTRAINT "scd_service_packages_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "public"."scd_specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_billing_transactions" ADD CONSTRAINT "scd_billing_transactions_invoice_c_id_fkey" FOREIGN KEY ("invoice_c_id") REFERENCES "public"."scd_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_billing_transactions" ADD CONSTRAINT "scd_billing_transactions_invoice_a_id_fkey" FOREIGN KEY ("invoice_a_id") REFERENCES "public"."scd_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_billing_transactions" ADD CONSTRAINT "scd_billing_transactions_invoice_b_id_fkey" FOREIGN KEY ("invoice_b_id") REFERENCES "public"."scd_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "public"."scd_withdrawal_methods_unique_id_idx" RENAME TO "scd_bank_information_unique_id_idx";

-- RenameIndex
ALTER INDEX "public"."scd_withdrawal_methods_unique_id_key" RENAME TO "scd_bank_information_unique_id_key";

-- RenameIndex
ALTER INDEX "public"."scd_withdrawal_methods_user_id_idx" RENAME TO "scd_bank_information_user_id_idx";

-- RenameIndex
ALTER INDEX "public"."scd_withdrawal_methods_verification_status_idx" RENAME TO "scd_bank_information_verification_status_idx";
