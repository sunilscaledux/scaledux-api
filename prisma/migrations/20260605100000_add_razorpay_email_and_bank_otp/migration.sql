-- AlterTable: add razorpay_email to bank information
ALTER TABLE "scd_bank_information" ADD COLUMN "razorpay_email" VARCHAR(255);

-- CreateIndex: unique constraint on razorpay_email
CREATE UNIQUE INDEX "scd_bank_information_razorpay_email_key" ON "scd_bank_information"("razorpay_email");

-- AlterEnum: add BANK_EMAIL_VERIFICATION to OtpType
ALTER TYPE "OtpType" ADD VALUE 'BANK_EMAIL_VERIFICATION';
