/*
  Warnings:

  - You are about to drop the column `currency` on the `scd_billing_transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."scd_billing_transactions" DROP COLUMN "currency",
ADD COLUMN     "currency_id" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "scd_billing_transactions_currency_id_idx" ON "public"."scd_billing_transactions"("currency_id");

-- AddForeignKey
ALTER TABLE "public"."scd_billing_transactions" ADD CONSTRAINT "scd_billing_transactions_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "public"."scd_currencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
