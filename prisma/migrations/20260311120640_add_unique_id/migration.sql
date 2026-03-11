/*
  Warnings:

  - A unique constraint covering the columns `[unique_id]` on the table `scd_withdrawal_methods` will be added. If there are existing duplicate values, this will fail.
  - The required column `unique_id` was added to the `scd_withdrawal_methods` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "public"."scd_withdrawal_methods" ADD COLUMN     "unique_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "scd_withdrawal_methods_unique_id_key" ON "public"."scd_withdrawal_methods"("unique_id");

-- CreateIndex
CREATE INDEX "scd_withdrawal_methods_unique_id_idx" ON "public"."scd_withdrawal_methods"("unique_id");
