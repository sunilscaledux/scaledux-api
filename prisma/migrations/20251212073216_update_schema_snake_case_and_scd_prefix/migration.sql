/*
  Warnings:

  - You are about to drop the `achievements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `agency_verifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `countries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `currencies` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `education` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `expertise_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `identity_verifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `industries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `languages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `licenses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `otps` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `personal_info` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `portfolios` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `service_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `service_keywords` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `service_packages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `service_sub_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `skills` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `specialties` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `states` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_expertises` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `work_experiences` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."achievements" DROP CONSTRAINT "achievements_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."agency_verifications" DROP CONSTRAINT "agency_verifications_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."countries" DROP CONSTRAINT "countries_currency_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."education" DROP CONSTRAINT "education_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."identity_verifications" DROP CONSTRAINT "identity_verifications_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."licenses" DROP CONSTRAINT "licenses_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."otps" DROP CONSTRAINT "otps_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."personal_info" DROP CONSTRAINT "personal_info_country_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."personal_info" DROP CONSTRAINT "personal_info_currency_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."personal_info" DROP CONSTRAINT "personal_info_state_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."personal_info" DROP CONSTRAINT "personal_info_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."portfolios" DROP CONSTRAINT "portfolios_industry_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."portfolios" DROP CONSTRAINT "portfolios_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."service_keywords" DROP CONSTRAINT "service_keywords_category_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."service_keywords" DROP CONSTRAINT "service_keywords_sub_category_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."service_packages" DROP CONSTRAINT "service_packages_category_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."service_packages" DROP CONSTRAINT "service_packages_sub_category_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."service_packages" DROP CONSTRAINT "service_packages_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."service_sub_categories" DROP CONSTRAINT "service_sub_categories_category_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."skills" DROP CONSTRAINT "skills_expertise_category_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."specialties" DROP CONSTRAINT "specialties_expertise_category_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."states" DROP CONSTRAINT "states_country_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_expertises" DROP CONSTRAINT "user_expertises_expertise_category_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_expertises" DROP CONSTRAINT "user_expertises_specialty_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_expertises" DROP CONSTRAINT "user_expertises_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."work_experiences" DROP CONSTRAINT "work_experiences_user_id_fkey";

-- DropTable
DROP TABLE "public"."achievements";

-- DropTable
DROP TABLE "public"."agency_verifications";

-- DropTable
DROP TABLE "public"."countries";

-- DropTable
DROP TABLE "public"."currencies";

-- DropTable
DROP TABLE "public"."education";

-- DropTable
DROP TABLE "public"."expertise_categories";

-- DropTable
DROP TABLE "public"."identity_verifications";

-- DropTable
DROP TABLE "public"."industries";

-- DropTable
DROP TABLE "public"."languages";

-- DropTable
DROP TABLE "public"."licenses";

-- DropTable
DROP TABLE "public"."otps";

-- DropTable
DROP TABLE "public"."personal_info";

-- DropTable
DROP TABLE "public"."portfolios";

-- DropTable
DROP TABLE "public"."service_categories";

-- DropTable
DROP TABLE "public"."service_keywords";

-- DropTable
DROP TABLE "public"."service_packages";

-- DropTable
DROP TABLE "public"."service_sub_categories";

-- DropTable
DROP TABLE "public"."skills";

-- DropTable
DROP TABLE "public"."specialties";

-- DropTable
DROP TABLE "public"."states";

-- DropTable
DROP TABLE "public"."user_expertises";

-- DropTable
DROP TABLE "public"."users";

-- DropTable
DROP TABLE "public"."work_experiences";

-- CreateTable
CREATE TABLE "public"."scd_users" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
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
    "linkedinId" TEXT,
    "profileImage" TEXT,
    "provider" TEXT,
    "coverImage" TEXT,
    "hideEmail" BOOLEAN NOT NULL DEFAULT false,
    "hidePhone" BOOLEAN NOT NULL DEFAULT false,
    "identity_verified_at" TIMESTAMP(3),
    "identity_verification_status" TEXT DEFAULT 'PENDING',
    "agency_verified_at" TIMESTAMP(3),
    "unique_id" TEXT NOT NULL,
    "agency_verification_status" TEXT DEFAULT 'PENDING',
    "show_as_agency" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "scd_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_personal_info" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT,
    "about" TEXT,
    "address" TEXT,
    "address_line_2" TEXT,
    "city" TEXT,
    "website" TEXT,
    "zipCode" TEXT,
    "hourly_rate" DOUBLE PRECISION,
    "links" JSONB,
    "currency_id" INTEGER,
    "country_id" INTEGER,
    "state_id" INTEGER,
    "languages" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_personal_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_education" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "school" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "area_of_study" TEXT NOT NULL,
    "start_month" TEXT NOT NULL,
    "start_year" TEXT NOT NULL,
    "end_month" TEXT,
    "end_year" TEXT,
    "is_ongoing" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "skills" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_licenses" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "institute" TEXT NOT NULL,
    "license_name" TEXT NOT NULL,
    "completed_month" TEXT NOT NULL,
    "completed_year" TEXT NOT NULL,
    "description" TEXT,
    "skills" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_expertise_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_expertise_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_specialties" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "expertise_category_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_skills" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "expertise_category_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_industries" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_industries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_user_expertises" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expertise_category_id" INTEGER NOT NULL,
    "specialty_id" INTEGER NOT NULL,
    "description" TEXT,
    "skills" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_user_expertises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_otps" (
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

    CONSTRAINT "scd_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_countries" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "phone_code" TEXT,
    "flag" TEXT,
    "currency_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_states" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "country_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_currencies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_languages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "native_name" TEXT,
    "code" TEXT NOT NULL,
    "country_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_work_experiences" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "company_website" TEXT,
    "description" TEXT,
    "start_month" TEXT NOT NULL,
    "start_year" TEXT NOT NULL,
    "end_month" TEXT,
    "end_year" TEXT,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_work_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_achievements" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "company" TEXT NOT NULL,
    "completed_month" TEXT NOT NULL,
    "completed_year" TEXT NOT NULL,
    "achievement_link" TEXT,
    "media_files" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_identity_verifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "nationality" TEXT,
    "id_type" TEXT NOT NULL,
    "id_number" TEXT NOT NULL,
    "id_expiry_date" TIMESTAMP(3),
    "issuing_country" TEXT NOT NULL,
    "id_document_urls" JSONB NOT NULL,
    "selfie_urls" JSONB NOT NULL,
    "address_line_1" TEXT NOT NULL,
    "address_line_2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postal_code" TEXT,
    "address_country" TEXT NOT NULL,
    "proof_of_address_consent" TEXT,
    "address_proof_urls" JSONB,
    "document_type" TEXT,
    "institution_name" TEXT,
    "document_date_issued" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" INTEGER,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_identity_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_agency_verifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "agency_name" TEXT NOT NULL,
    "cin" TEXT NOT NULL,
    "document_urls" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "reviewed_by" INTEGER,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_agency_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_portfolios" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "hide_company_name" BOOLEAN NOT NULL DEFAULT false,
    "industry_id" INTEGER NOT NULL,
    "role" TEXT,
    "project_skills" JSONB NOT NULL,
    "thumbnail_urls" JSONB,
    "media_urls" JSONB,
    "project_link" TEXT,
    "completion_month" TEXT NOT NULL,
    "completion_year" TEXT NOT NULL,
    "references" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_service_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_service_sub_categories" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_service_sub_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_service_keywords" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "sub_category_id" INTEGER,
    "name" VARCHAR(100) NOT NULL,
    "popularity_score" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_service_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_service_packages" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "category_id" INTEGER NOT NULL,
    "sub_category_id" INTEGER,
    "package_description" TEXT,
    "features" JSONB NOT NULL DEFAULT '[]',
    "industries" JSONB NOT NULL DEFAULT '[]',
    "keywords" JSONB NOT NULL DEFAULT '[]',
    "scope" JSONB NOT NULL DEFAULT '{}',
    "extra_add_ons" JSONB NOT NULL DEFAULT '[]',
    "deliverables" JSONB NOT NULL DEFAULT '[]',
    "faqs" JSONB NOT NULL DEFAULT '[]',
    "links" JSONB NOT NULL DEFAULT '[]',
    "requirements" JSONB NOT NULL DEFAULT '[]',
    "thumbnail" JSONB NOT NULL DEFAULT '[]',
    "images" JSONB NOT NULL DEFAULT '[]',
    "video" JSONB NOT NULL DEFAULT '[]',
    "documents" JSONB NOT NULL DEFAULT '[]',
    "has_basic" BOOLEAN NOT NULL DEFAULT false,
    "has_standard" BOOLEAN NOT NULL DEFAULT false,
    "has_premium" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_service_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_users_email_key" ON "public"."scd_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "scd_users_phone_key" ON "public"."scd_users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "scd_users_googleId_key" ON "public"."scd_users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "scd_users_linkedinId_key" ON "public"."scd_users"("linkedinId");

-- CreateIndex
CREATE UNIQUE INDEX "scd_users_unique_id_key" ON "public"."scd_users"("unique_id");

-- CreateIndex
CREATE INDEX "scd_users_email_phone_idx" ON "public"."scd_users"("email", "phone");

-- CreateIndex
CREATE INDEX "scd_users_last_name_first_name_email_idx" ON "public"."scd_users"("last_name", "first_name", "email");

-- CreateIndex
CREATE INDEX "scd_users_googleId_idx" ON "public"."scd_users"("googleId");

-- CreateIndex
CREATE INDEX "scd_users_linkedinId_idx" ON "public"."scd_users"("linkedinId");

-- CreateIndex
CREATE UNIQUE INDEX "scd_personal_info_user_id_key" ON "public"."scd_personal_info"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_expertise_categories_name_key" ON "public"."scd_expertise_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_specialties_name_expertise_category_id_key" ON "public"."scd_specialties"("name", "expertise_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_skills_name_expertise_category_id_key" ON "public"."scd_skills"("name", "expertise_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_industries_name_key" ON "public"."scd_industries"("name");

-- CreateIndex
CREATE INDEX "scd_otps_email_otp_type_verified_idx" ON "public"."scd_otps"("email", "otp_type", "verified");

-- CreateIndex
CREATE INDEX "scd_otps_phone_otp_type_verified_idx" ON "public"."scd_otps"("phone", "otp_type", "verified");

-- CreateIndex
CREATE INDEX "scd_otps_expires_at_idx" ON "public"."scd_otps"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "scd_countries_name_key" ON "public"."scd_countries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_countries_code_key" ON "public"."scd_countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "scd_states_name_country_id_key" ON "public"."scd_states"("name", "country_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_currencies_name_key" ON "public"."scd_currencies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_currencies_code_key" ON "public"."scd_currencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "scd_languages_name_key" ON "public"."scd_languages"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_languages_code_key" ON "public"."scd_languages"("code");

-- CreateIndex
CREATE INDEX "scd_identity_verifications_user_id_status_idx" ON "public"."scd_identity_verifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "scd_identity_verifications_status_idx" ON "public"."scd_identity_verifications"("status");

-- CreateIndex
CREATE INDEX "scd_agency_verifications_user_id_status_idx" ON "public"."scd_agency_verifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "scd_agency_verifications_status_idx" ON "public"."scd_agency_verifications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "scd_portfolios_unique_id_key" ON "public"."scd_portfolios"("unique_id");

-- CreateIndex
CREATE INDEX "scd_portfolios_user_id_status_idx" ON "public"."scd_portfolios"("user_id", "status");

-- CreateIndex
CREATE INDEX "scd_portfolios_status_idx" ON "public"."scd_portfolios"("status");

-- CreateIndex
CREATE INDEX "scd_portfolios_industry_id_idx" ON "public"."scd_portfolios"("industry_id");

-- CreateIndex
CREATE INDEX "scd_portfolios_deleted_at_idx" ON "public"."scd_portfolios"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "scd_service_categories_name_key" ON "public"."scd_service_categories"("name");

-- CreateIndex
CREATE INDEX "scd_service_categories_is_active_idx" ON "public"."scd_service_categories"("is_active");

-- CreateIndex
CREATE INDEX "scd_service_sub_categories_category_id_idx" ON "public"."scd_service_sub_categories"("category_id");

-- CreateIndex
CREATE INDEX "scd_service_sub_categories_is_active_idx" ON "public"."scd_service_sub_categories"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "scd_service_sub_categories_category_id_name_key" ON "public"."scd_service_sub_categories"("category_id", "name");

-- CreateIndex
CREATE INDEX "scd_service_keywords_category_id_idx" ON "public"."scd_service_keywords"("category_id");

-- CreateIndex
CREATE INDEX "scd_service_keywords_sub_category_id_idx" ON "public"."scd_service_keywords"("sub_category_id");

-- CreateIndex
CREATE INDEX "scd_service_keywords_is_active_idx" ON "public"."scd_service_keywords"("is_active");

-- CreateIndex
CREATE INDEX "scd_service_keywords_popularity_score_idx" ON "public"."scd_service_keywords"("popularity_score");

-- CreateIndex
CREATE INDEX "scd_service_keywords_name_idx" ON "public"."scd_service_keywords"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_service_keywords_category_id_name_key" ON "public"."scd_service_keywords"("category_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_service_packages_unique_id_key" ON "public"."scd_service_packages"("unique_id");

-- CreateIndex
CREATE INDEX "scd_service_packages_user_id_idx" ON "public"."scd_service_packages"("user_id");

-- CreateIndex
CREATE INDEX "scd_service_packages_category_id_idx" ON "public"."scd_service_packages"("category_id");

-- CreateIndex
CREATE INDEX "scd_service_packages_sub_category_id_idx" ON "public"."scd_service_packages"("sub_category_id");

-- CreateIndex
CREATE INDEX "scd_service_packages_status_idx" ON "public"."scd_service_packages"("status");

-- AddForeignKey
ALTER TABLE "public"."scd_personal_info" ADD CONSTRAINT "scd_personal_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_personal_info" ADD CONSTRAINT "scd_personal_info_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "public"."scd_currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_personal_info" ADD CONSTRAINT "scd_personal_info_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."scd_countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_personal_info" ADD CONSTRAINT "scd_personal_info_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."scd_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_education" ADD CONSTRAINT "scd_education_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_licenses" ADD CONSTRAINT "scd_licenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_specialties" ADD CONSTRAINT "scd_specialties_expertise_category_id_fkey" FOREIGN KEY ("expertise_category_id") REFERENCES "public"."scd_expertise_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_skills" ADD CONSTRAINT "scd_skills_expertise_category_id_fkey" FOREIGN KEY ("expertise_category_id") REFERENCES "public"."scd_expertise_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_user_expertises" ADD CONSTRAINT "scd_user_expertises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_user_expertises" ADD CONSTRAINT "scd_user_expertises_expertise_category_id_fkey" FOREIGN KEY ("expertise_category_id") REFERENCES "public"."scd_expertise_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_user_expertises" ADD CONSTRAINT "scd_user_expertises_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "public"."scd_specialties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_otps" ADD CONSTRAINT "scd_otps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_countries" ADD CONSTRAINT "scd_countries_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "public"."scd_currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_states" ADD CONSTRAINT "scd_states_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."scd_countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_work_experiences" ADD CONSTRAINT "scd_work_experiences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_achievements" ADD CONSTRAINT "scd_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_identity_verifications" ADD CONSTRAINT "scd_identity_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_agency_verifications" ADD CONSTRAINT "scd_agency_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_portfolios" ADD CONSTRAINT "scd_portfolios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_portfolios" ADD CONSTRAINT "scd_portfolios_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "public"."scd_industries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_service_sub_categories" ADD CONSTRAINT "scd_service_sub_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."scd_service_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_service_keywords" ADD CONSTRAINT "scd_service_keywords_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."scd_service_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_service_keywords" ADD CONSTRAINT "scd_service_keywords_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "public"."scd_service_sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_service_packages" ADD CONSTRAINT "scd_service_packages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_service_packages" ADD CONSTRAINT "scd_service_packages_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."scd_service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_service_packages" ADD CONSTRAINT "scd_service_packages_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "public"."scd_service_sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
