/*
  Warnings:

  - Added the required column `scheduled_end` to the `scd_bookings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "scd_bookings" ADD COLUMN     "scheduled_end" TIMESTAMP(3) NOT NULL;
