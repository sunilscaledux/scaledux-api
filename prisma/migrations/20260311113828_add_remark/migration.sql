/*
  Warnings:

  - You are about to drop the column `upi_id` on the `scd_withdrawal_methods` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."scd_withdrawal_methods" DROP COLUMN "upi_id";
