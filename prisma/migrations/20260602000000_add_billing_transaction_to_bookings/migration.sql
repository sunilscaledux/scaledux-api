-- AlterTable
ALTER TABLE "scd_bookings" ADD COLUMN "billing_transaction_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "scd_bookings_billing_transaction_id_key" ON "scd_bookings"("billing_transaction_id");

-- AddForeignKey
ALTER TABLE "scd_bookings" ADD CONSTRAINT "scd_bookings_billing_transaction_id_fkey" FOREIGN KEY ("billing_transaction_id") REFERENCES "scd_billing_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
