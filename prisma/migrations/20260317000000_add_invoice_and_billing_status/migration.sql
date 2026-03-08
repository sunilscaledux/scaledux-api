-- CreateTable
CREATE TABLE "scd_invoices" (
    "id" SERIAL NOT NULL,
    "billing_transaction_id" INTEGER NOT NULL,
    "party" VARCHAR(20) NOT NULL,
    "sender_name" VARCHAR(255) NOT NULL,
    "receiver_name" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency_code" VARCHAR(10) NOT NULL,
    "description" TEXT NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "gst_number" VARCHAR(50),
    "file_url" VARCHAR(500),
    "meta" JSONB,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_invoices_pkey" PRIMARY KEY ("id")
);

-- Add columns to scd_billing_transactions
ALTER TABLE "scd_billing_transactions" ADD COLUMN "sender_status" VARCHAR(20);
ALTER TABLE "scd_billing_transactions" ADD COLUMN "receiver_status" VARCHAR(20);
ALTER TABLE "scd_billing_transactions" ADD COLUMN "admin_status" VARCHAR(30);
ALTER TABLE "scd_billing_transactions" ADD COLUMN "payer_invoice_id" INTEGER;
ALTER TABLE "scd_billing_transactions" ADD COLUMN "receiver_invoice_id" INTEGER;

-- Backfill sender_status and receiver_status from status
UPDATE "scd_billing_transactions" SET "sender_status" = "status", "receiver_status" = "status" WHERE "sender_status" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "scd_invoices_invoice_number_key" ON "scd_invoices"("invoice_number");
CREATE INDEX "scd_invoices_billing_transaction_id_idx" ON "scd_invoices"("billing_transaction_id");

-- CreateIndex (unique for one-to-one)
CREATE UNIQUE INDEX "scd_billing_transactions_payer_invoice_id_key" ON "scd_billing_transactions"("payer_invoice_id");
CREATE UNIQUE INDEX "scd_billing_transactions_receiver_invoice_id_key" ON "scd_billing_transactions"("receiver_invoice_id");

-- AddForeignKey
ALTER TABLE "scd_invoices" ADD CONSTRAINT "scd_invoices_billing_transaction_id_fkey" FOREIGN KEY ("billing_transaction_id") REFERENCES "scd_billing_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scd_billing_transactions" ADD CONSTRAINT "scd_billing_transactions_payer_invoice_id_fkey" FOREIGN KEY ("payer_invoice_id") REFERENCES "scd_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "scd_billing_transactions" ADD CONSTRAINT "scd_billing_transactions_receiver_invoice_id_fkey" FOREIGN KEY ("receiver_invoice_id") REFERENCES "scd_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
