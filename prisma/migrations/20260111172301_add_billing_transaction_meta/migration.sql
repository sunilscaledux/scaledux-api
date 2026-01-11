-- CreateTable
CREATE TABLE "public"."scd_billing_transaction_meta" (
    "id" SERIAL NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "scd_billing_transaction_meta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scd_billing_transaction_meta_transaction_id_idx" ON "public"."scd_billing_transaction_meta"("transaction_id");

-- CreateIndex
CREATE INDEX "scd_billing_transaction_meta_key_idx" ON "public"."scd_billing_transaction_meta"("key");

-- AddForeignKey
ALTER TABLE "public"."scd_billing_transaction_meta" ADD CONSTRAINT "scd_billing_transaction_meta_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."scd_billing_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
