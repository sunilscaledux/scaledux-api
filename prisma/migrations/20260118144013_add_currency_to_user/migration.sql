/*
  Warnings:

  - You are about to drop the column `availability` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `business_model` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `company_cover_image` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `company_location` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `company_logo` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `company_name` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `company_size` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `company_tagline` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `company_type` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `company_website` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `currency_id` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `expertise_areas` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `funding_amount` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `funding_stage` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `headquarters` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `industry` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `investment_focus` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `investment_stage` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `mentoring_experience` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `portfolio_companies` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `problem_statement` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `revenue_model` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `seeking_funding` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `session_rate` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `social_links` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `solution` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `target_market` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `ticket_size_max` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `ticket_size_min` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `total_funding` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `unique_value_prop` on the `scd_user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `year_founded` on the `scd_user_profiles` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."scd_user_profiles" DROP CONSTRAINT "scd_user_profiles_currency_id_fkey";

-- AlterTable
ALTER TABLE "public"."scd_user_profiles" DROP COLUMN "availability",
DROP COLUMN "business_model",
DROP COLUMN "company_cover_image",
DROP COLUMN "company_location",
DROP COLUMN "company_logo",
DROP COLUMN "company_name",
DROP COLUMN "company_size",
DROP COLUMN "company_tagline",
DROP COLUMN "company_type",
DROP COLUMN "company_website",
DROP COLUMN "currency_id",
DROP COLUMN "description",
DROP COLUMN "expertise_areas",
DROP COLUMN "funding_amount",
DROP COLUMN "funding_stage",
DROP COLUMN "headquarters",
DROP COLUMN "industry",
DROP COLUMN "investment_focus",
DROP COLUMN "investment_stage",
DROP COLUMN "mentoring_experience",
DROP COLUMN "portfolio_companies",
DROP COLUMN "problem_statement",
DROP COLUMN "revenue_model",
DROP COLUMN "seeking_funding",
DROP COLUMN "session_rate",
DROP COLUMN "social_links",
DROP COLUMN "solution",
DROP COLUMN "target_market",
DROP COLUMN "ticket_size_max",
DROP COLUMN "ticket_size_min",
DROP COLUMN "total_funding",
DROP COLUMN "unique_value_prop",
DROP COLUMN "year_founded";

-- AlterTable
ALTER TABLE "public"."scd_users" ADD COLUMN     "currency_id" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."scd_users" ADD CONSTRAINT "scd_users_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "public"."scd_currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
