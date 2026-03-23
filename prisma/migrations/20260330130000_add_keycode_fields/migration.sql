-- AlterTable: Add keycode to personal_info
ALTER TABLE "scd_personal_info" ADD COLUMN "keycode" TEXT;
CREATE UNIQUE INDEX "scd_personal_info_keycode_key" ON "scd_personal_info"("keycode");

-- AlterTable: Add keycode to identity_verifications
ALTER TABLE "scd_identity_verifications" ADD COLUMN "keycode" TEXT;
