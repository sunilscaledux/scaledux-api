/*
  Warnings:

  - You are about to drop the column `invoice_b_id` on the `scd_billing_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `invoice_c_id` on the `scd_billing_transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "scd_billing_transactions" DROP COLUMN "invoice_b_id",
DROP COLUMN "invoice_c_id";

-- AlterTable
ALTER TABLE "scd_password_history" ALTER COLUMN "source" SET DATA TYPE TEXT;
