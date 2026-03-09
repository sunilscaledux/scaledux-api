-- DropForeignKey
ALTER TABLE "public"."scd_invoices" DROP CONSTRAINT "scd_invoices_billing_transaction_id_fkey";

-- CreateIndex
CREATE INDEX "scd_invoices_invoice_number_idx" ON "public"."scd_invoices"("invoice_number");
