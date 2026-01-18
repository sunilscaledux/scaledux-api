/*
  Warnings:

  - A unique constraint covering the columns `[user_id,profile_type]` on the table `scd_user_profiles` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."scd_user_profiles_user_id_key";

-- CreateIndex
CREATE INDEX "scd_user_profiles_user_id_idx" ON "public"."scd_user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_user_profiles_user_id_profile_type_key" ON "public"."scd_user_profiles"("user_id", "profile_type");
