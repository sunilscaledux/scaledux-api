-- AlterTable: add razorpay_activation_status to bank information
ALTER TABLE "scd_bank_information" ADD COLUMN "razorpay_activation_status" VARCHAR(30);
