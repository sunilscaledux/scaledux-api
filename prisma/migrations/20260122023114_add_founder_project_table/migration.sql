/*
  Warnings:

  - You are about to drop the column `revenue_model` on the `scd_company_profiles` table. All the data in the column will be lost.
  - You are about to drop the `scd_freelancer_profiles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."scd_freelancer_profiles" DROP CONSTRAINT "scd_freelancer_profiles_country_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scd_freelancer_profiles" DROP CONSTRAINT "scd_freelancer_profiles_state_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scd_freelancer_profiles" DROP CONSTRAINT "scd_freelancer_profiles_user_id_fkey";

-- AlterTable
ALTER TABLE "public"."scd_company_profiles" DROP COLUMN "revenue_model",
ADD COLUMN     "revenue_description" TEXT,
ADD COLUMN     "revenue_model_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "traction_document" TEXT,
ADD COLUMN     "traction_title" TEXT;

-- AlterTable
ALTER TABLE "public"."scd_users" ADD COLUMN     "role" TEXT DEFAULT 'freelancer';

-- DropTable
DROP TABLE "public"."scd_freelancer_profiles";

-- CreateTable
CREATE TABLE "public"."scd_personal_info" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "unique_id" TEXT NOT NULL,
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
    "show_as_agency" BOOLEAN NOT NULL DEFAULT false,
    "country_id" INTEGER,
    "state_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_personal_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_funding_rounds" (
    "id" SERIAL NOT NULL,
    "company_profile_id" INTEGER NOT NULL,
    "investor_name" TEXT NOT NULL,
    "funding_stage" TEXT NOT NULL,
    "funding_amount" DECIMAL(15,2) NOT NULL,
    "funding_date" TIMESTAMP(3) NOT NULL,
    "funding_valuation" DECIMAL(15,2),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_funding_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_raising_funds" (
    "id" SERIAL NOT NULL,
    "company_profile_id" INTEGER NOT NULL,
    "is_raising" BOOLEAN NOT NULL DEFAULT false,
    "round_type" TEXT,
    "target_amount" DECIMAL(15,2),
    "uses_of_fund" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_raising_funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_revenue_models" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_revenue_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_founder_projects" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "project_title" VARCHAR(50) NOT NULL,
    "project_description" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "sub_category_id" INTEGER,
    "project_files" JSONB NOT NULL DEFAULT '[]',
    "scope_of_work" TEXT NOT NULL,
    "skills_required" JSONB NOT NULL,
    "experience_needed" VARCHAR(50) NOT NULL,
    "budget_currency" VARCHAR(10) NOT NULL,
    "budget_amount" VARCHAR(20) NOT NULL,
    "is_nda_required" BOOLEAN NOT NULL DEFAULT false,
    "screening_questions" JSONB NOT NULL DEFAULT '[]',
    "advanced_preferences" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "invited_count" INTEGER NOT NULL DEFAULT 0,
    "proposals_count" INTEGER NOT NULL DEFAULT 0,
    "hired_count" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_founder_projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_personal_info_user_id_key" ON "public"."scd_personal_info"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_personal_info_unique_id_key" ON "public"."scd_personal_info"("unique_id");

-- CreateIndex
CREATE INDEX "scd_personal_info_unique_id_idx" ON "public"."scd_personal_info"("unique_id");

-- CreateIndex
CREATE INDEX "scd_personal_info_user_id_idx" ON "public"."scd_personal_info"("user_id");

-- CreateIndex
CREATE INDEX "scd_funding_rounds_company_profile_id_idx" ON "public"."scd_funding_rounds"("company_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_raising_funds_company_profile_id_key" ON "public"."scd_raising_funds"("company_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_revenue_models_name_key" ON "public"."scd_revenue_models"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_revenue_models_code_key" ON "public"."scd_revenue_models"("code");

-- CreateIndex
CREATE UNIQUE INDEX "scd_founder_projects_unique_id_key" ON "public"."scd_founder_projects"("unique_id");

-- CreateIndex
CREATE INDEX "scd_founder_projects_user_id_status_idx" ON "public"."scd_founder_projects"("user_id", "status");

-- CreateIndex
CREATE INDEX "scd_founder_projects_status_idx" ON "public"."scd_founder_projects"("status");

-- CreateIndex
CREATE INDEX "scd_founder_projects_category_id_idx" ON "public"."scd_founder_projects"("category_id");

-- CreateIndex
CREATE INDEX "scd_founder_projects_sub_category_id_idx" ON "public"."scd_founder_projects"("sub_category_id");

-- CreateIndex
CREATE INDEX "scd_founder_projects_deleted_at_idx" ON "public"."scd_founder_projects"("deleted_at");

-- CreateIndex
CREATE INDEX "scd_founder_projects_created_at_idx" ON "public"."scd_founder_projects"("created_at");

-- AddForeignKey
ALTER TABLE "public"."scd_personal_info" ADD CONSTRAINT "scd_personal_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_personal_info" ADD CONSTRAINT "scd_personal_info_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."scd_countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_personal_info" ADD CONSTRAINT "scd_personal_info_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."scd_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_funding_rounds" ADD CONSTRAINT "scd_funding_rounds_company_profile_id_fkey" FOREIGN KEY ("company_profile_id") REFERENCES "public"."scd_company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_raising_funds" ADD CONSTRAINT "scd_raising_funds_company_profile_id_fkey" FOREIGN KEY ("company_profile_id") REFERENCES "public"."scd_company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_founder_projects" ADD CONSTRAINT "scd_founder_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_founder_projects" ADD CONSTRAINT "scd_founder_projects_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."scd_service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_founder_projects" ADD CONSTRAINT "scd_founder_projects_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "public"."scd_service_sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
