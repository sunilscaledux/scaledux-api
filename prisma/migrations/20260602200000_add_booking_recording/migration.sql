-- AlterTable
ALTER TABLE "scd_bookings" ADD COLUMN "wants_recording" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "scd_bookings" ADD COLUMN "recording_amount" DECIMAL(12,2);
