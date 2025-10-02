-- CreateEnum
CREATE TYPE "public"."OtpType" AS ENUM ('REGISTRATION_VERIFICATION', 'LOGIN_VERIFICATION', 'FORGOT_PASSWORD_VERIFICATION');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "FirstName" TEXT NOT NULL,
    "LastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "phone_verified_at" TIMESTAMP(3),
    "password" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "notification" BOOLEAN NOT NULL DEFAULT false,
    "terms" BOOLEAN NOT NULL DEFAULT true,
    "googleId" TEXT,
    "profileImage" TEXT,
    "provider" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "public"."users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "public"."users"("googleId");

-- CreateIndex
CREATE INDEX "users_email_phone_idx" ON "public"."users"("email", "phone");

-- CreateIndex
CREATE INDEX "users_LastName_FirstName_email_idx" ON "public"."users"("LastName", "FirstName", "email");

-- CreateIndex
CREATE INDEX "users_googleId_idx" ON "public"."users"("googleId");

-- CreateIndex
CREATE INDEX "otps_email_otp_type_verified_idx" ON "public"."otps"("email", "otp_type", "verified");

-- CreateIndex
CREATE INDEX "otps_phone_otp_type_verified_idx" ON "public"."otps"("phone", "otp_type", "verified");

-- CreateIndex
CREATE INDEX "otps_expires_at_idx" ON "public"."otps"("expires_at");

-- AddForeignKey
ALTER TABLE "public"."otps" ADD CONSTRAINT "otps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
