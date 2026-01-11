/*
  Warnings:

  - A unique constraint covering the columns `[unique_id]` on the table `scd_billing_transactions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `unique_id` to the `scd_billing_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."scd_billing_transactions" ADD COLUMN     "unique_id" VARCHAR(26) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "scd_billing_transactions_unique_id_key" ON "public"."scd_billing_transactions"("unique_id");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_unique_id_idx" ON "public"."scd_billing_transactions"("unique_id");
