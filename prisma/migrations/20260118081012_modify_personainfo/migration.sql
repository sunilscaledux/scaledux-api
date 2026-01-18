/*
  Warnings:

  - You are about to drop the column `coverImage` on the `scd_users` table. All the data in the column will be lost.
  - You are about to drop the column `hideEmail` on the `scd_users` table. All the data in the column will be lost.
  - You are about to drop the column `hidePhone` on the `scd_users` table. All the data in the column will be lost.
  - You are about to drop the column `profileImage` on the `scd_users` table. All the data in the column will be lost.
  - You are about to drop the column `unique_id` on the `scd_users` table. All the data in the column will be lost.
  - You are about to drop the `scd_company_details` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `scd_personal_info` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."scd_company_details" DROP CONSTRAINT "scd_company_details_country_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scd_company_details" DROP CONSTRAINT "scd_company_details_currency_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scd_company_details" DROP CONSTRAINT "scd_company_details_state_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scd_company_details" DROP CONSTRAINT "scd_company_details_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scd_personal_info" DROP CONSTRAINT "scd_personal_info_country_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scd_personal_info" DROP CONSTRAINT "scd_personal_info_currency_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scd_personal_info" DROP CONSTRAINT "scd_personal_info_state_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scd_personal_info" DROP CONSTRAINT "scd_personal_info_user_id_fkey";

-- DropIndex
DROP INDEX "public"."scd_users_unique_id_key";

-- AlterTable
ALTER TABLE "public"."scd_users" DROP COLUMN "coverImage",
DROP COLUMN "hideEmail",
DROP COLUMN "hidePhone",
DROP COLUMN "profileImage",
DROP COLUMN "unique_id";

-- DropTable
DROP TABLE "public"."scd_company_details";

-- DropTable
DROP TABLE "public"."scd_personal_info";

-- CreateTable
CREATE TABLE "public"."scd_user_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "unique_id" TEXT NOT NULL,
    "profile_type" TEXT NOT NULL DEFAULT 'freelancer',
    "profileImage" TEXT,
    "coverImage" TEXT,
    "hideEmail" BOOLEAN NOT NULL DEFAULT false,
    "hidePhone" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "about" TEXT,
    "address" TEXT,
    "address_line_2" TEXT,
    "city" TEXT,
    "website" TEXT,
    "zipCode" TEXT,
    "hourly_rate" DOUBLE PRECISION,
    "links" JSONB,
    "languages" JSONB,
    "company_name" TEXT,
    "company_tagline" TEXT,
    "company_logo" TEXT,
    "company_cover_image" TEXT,
    "year_founded" INTEGER,
    "company_size" TEXT,
    "headquarters" TEXT,
    "company_location" TEXT,
    "company_website" TEXT,
    "industry" TEXT,
    "company_type" TEXT,
    "description" TEXT,
    "problem_statement" TEXT,
    "solution" TEXT,
    "target_market" TEXT,
    "unique_value_prop" TEXT,
    "business_model" TEXT,
    "revenue_model" TEXT,
    "funding_stage" TEXT,
    "total_funding" DOUBLE PRECISION,
    "seeking_funding" BOOLEAN NOT NULL DEFAULT false,
    "funding_amount" DOUBLE PRECISION,
    "social_links" JSONB,
    "expertise_areas" JSONB,
    "mentoring_experience" INTEGER,
    "availability" TEXT,
    "session_rate" DOUBLE PRECISION,
    "investment_focus" JSONB,
    "investment_stage" TEXT,
    "ticket_size_min" DOUBLE PRECISION,
    "ticket_size_max" DOUBLE PRECISION,
    "portfolio_companies" JSONB,
    "currency_id" INTEGER,
    "country_id" INTEGER,
    "state_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_user_profiles_user_id_key" ON "public"."scd_user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_user_profiles_unique_id_key" ON "public"."scd_user_profiles"("unique_id");

-- CreateIndex
CREATE INDEX "scd_user_profiles_profile_type_idx" ON "public"."scd_user_profiles"("profile_type");

-- CreateIndex
CREATE INDEX "scd_user_profiles_unique_id_idx" ON "public"."scd_user_profiles"("unique_id");

-- AddForeignKey
ALTER TABLE "public"."scd_user_profiles" ADD CONSTRAINT "scd_user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_user_profiles" ADD CONSTRAINT "scd_user_profiles_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "public"."scd_currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_user_profiles" ADD CONSTRAINT "scd_user_profiles_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."scd_countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_user_profiles" ADD CONSTRAINT "scd_user_profiles_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."scd_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;
