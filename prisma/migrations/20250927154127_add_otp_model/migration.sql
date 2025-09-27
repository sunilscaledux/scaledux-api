-- CreateEnum
CREATE TYPE "public"."OtpType" AS ENUM ('EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET', 'LOGIN_VERIFICATION');

-- CreateTable
CREATE TABLE "public"."otps" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "email" TEXT,
    "phone" TEXT,
    "otp_code" TEXT NOT NULL,
    "otp_type" "public"."OtpType" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otps_email_otp_type_verified_idx" ON "public"."otps"("email", "otp_type", "verified");

-- CreateIndex
CREATE INDEX "otps_phone_otp_type_verified_idx" ON "public"."otps"("phone", "otp_type", "verified");

-- CreateIndex
CREATE INDEX "otps_expires_at_idx" ON "public"."otps"("expires_at");

-- AddForeignKey
ALTER TABLE "public"."otps" ADD CONSTRAINT "otps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
