-- AlterTable: add fee breakdown columns to billing transactions
ALTER TABLE "scd_billing_transactions" ADD COLUMN IF NOT EXISTS "platform_fee_amount" DECIMAL(10,2);
ALTER TABLE "scd_billing_transactions" ADD COLUMN IF NOT EXISTS "platform_fee_gst" DECIMAL(10,2);
ALTER TABLE "scd_billing_transactions" ADD COLUMN IF NOT EXISTS "commission_amount" DECIMAL(10,2);
ALTER TABLE "scd_billing_transactions" ADD COLUMN IF NOT EXISTS "commission_gst" DECIMAL(10,2);
ALTER TABLE "scd_billing_transactions" ADD COLUMN IF NOT EXISTS "processing_fee_amount" DECIMAL(10,2);
ALTER TABLE "scd_billing_transactions" ADD COLUMN IF NOT EXISTS "processing_fee_gst" DECIMAL(10,2);
ALTER TABLE "scd_billing_transactions" ADD COLUMN IF NOT EXISTS "tcs_amount" DECIMAL(10,2);
ALTER TABLE "scd_billing_transactions" ADD COLUMN IF NOT EXISTS "razorpay_transfer_id" VARCHAR(50);
ALTER TABLE "scd_billing_transactions" ADD COLUMN IF NOT EXISTS "on_hold" BOOLEAN DEFAULT false NOT NULL;

-- AlterTable: add invoice type columns to billing transactions
ALTER TABLE "scd_billing_transactions" ADD COLUMN IF NOT EXISTS "invoice_a_id" INTEGER;
ALTER TABLE "scd_billing_transactions" ADD COLUMN IF NOT EXISTS "invoice_b_id" INTEGER;
ALTER TABLE "scd_billing_transactions" ADD COLUMN IF NOT EXISTS "invoice_c_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "scd_billing_transactions_invoice_a_id_key" ON "scd_billing_transactions"("invoice_a_id");

-- AlterTable: add fee breakdown and invoice type columns to invoices
ALTER TABLE "scd_invoices" ADD COLUMN IF NOT EXISTS "invoice_type" VARCHAR(5);
ALTER TABLE "scd_invoices" ADD COLUMN IF NOT EXISTS "platform_fee_amount" DECIMAL(10,2);
ALTER TABLE "scd_invoices" ADD COLUMN IF NOT EXISTS "commission_amount" DECIMAL(10,2);
ALTER TABLE "scd_invoices" ADD COLUMN IF NOT EXISTS "processing_fee_amount" DECIMAL(10,2);
ALTER TABLE "scd_invoices" ADD COLUMN IF NOT EXISTS "tcs_amount" DECIMAL(10,2);
ALTER TABLE "scd_invoices" ADD COLUMN IF NOT EXISTS "is_bill_of_supply" BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE "scd_invoices" ADD COLUMN IF NOT EXISTS "financial_year" VARCHAR(9);
ALTER TABLE "scd_invoices" ADD COLUMN IF NOT EXISTS "sequence_number" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "scd_invoices_invoice_type_financial_year_idx" ON "scd_invoices"("invoice_type", "financial_year");

-- CreateTable: invoice sequences for sequential numbering
CREATE TABLE IF NOT EXISTS "scd_invoice_sequences" (
    "id" SERIAL NOT NULL,
    "invoice_type" VARCHAR(5) NOT NULL,
    "financial_year" VARCHAR(9) NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "scd_invoice_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "scd_invoice_sequences_invoice_type_financial_year_key" ON "scd_invoice_sequences"("invoice_type", "financial_year");

-- AddForeignKey
ALTER TABLE "scd_billing_transactions" ADD CONSTRAINT "scd_billing_transactions_invoice_a_id_fkey" FOREIGN KEY ("invoice_a_id") REFERENCES "scd_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
