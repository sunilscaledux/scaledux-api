-- Add 2FA fields to users table
ALTER TABLE "scd_users" ADD COLUMN "two_fa_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "scd_users" ADD COLUMN "two_fa_method" TEXT;
ALTER TABLE "scd_users" ADD COLUMN "backup_codes" JSONB;

-- Add is_trusted to login devices
ALTER TABLE "scd_login_devices" ADD COLUMN "is_trusted" BOOLEAN NOT NULL DEFAULT false;

-- Add TWO_FA_VERIFICATION to OtpType enum
ALTER TYPE "OtpType" ADD VALUE 'TWO_FA_VERIFICATION';
