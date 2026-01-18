/*
  Warnings:

  - You are about to drop the `scd_user_profiles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."scd_user_profiles" DROP CONSTRAINT "scd_user_profiles_country_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scd_user_profiles" DROP CONSTRAINT "scd_user_profiles_state_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scd_user_profiles" DROP CONSTRAINT "scd_user_profiles_user_id_fkey";

-- DropTable
DROP TABLE "public"."scd_user_profiles";

-- CreateTable
CREATE TABLE "public"."scd_freelancer_profiles" (
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

    CONSTRAINT "scd_freelancer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_company_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "unique_id" TEXT NOT NULL,
    "profileImage" TEXT,
    "coverImage" TEXT,
    "hideEmail" BOOLEAN NOT NULL DEFAULT false,
    "hidePhone" BOOLEAN NOT NULL DEFAULT false,
    "company_name" TEXT,
    "company_description" TEXT,
    "company_website" TEXT,
    "company_size" TEXT,
    "founded_year" INTEGER,
    "industry" TEXT,
    "company_stage" TEXT,
    "team_size" INTEGER,
    "revenue_model" TEXT,
    "target_market" TEXT,
    "problem_statement" TEXT,
    "solution_statement" TEXT,
    "funding_status" TEXT,
    "total_funding" DECIMAL(15,2),
    "address" TEXT,
    "address_line_2" TEXT,
    "city" TEXT,
    "zipCode" TEXT,
    "links" JSONB,
    "country_id" INTEGER,
    "state_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_mentor_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "unique_id" TEXT NOT NULL,
    "profileImage" TEXT,
    "coverImage" TEXT,
    "hideEmail" BOOLEAN NOT NULL DEFAULT false,
    "hidePhone" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "about" TEXT,
    "session_rate" DOUBLE PRECISION,
    "expertise_areas" JSONB,
    "availability" JSONB,
    "years_of_experience" INTEGER,
    "address" TEXT,
    "city" TEXT,
    "zipCode" TEXT,
    "links" JSONB,
    "country_id" INTEGER,
    "state_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_mentor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_investor_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "unique_id" TEXT NOT NULL,
    "profileImage" TEXT,
    "coverImage" TEXT,
    "hideEmail" BOOLEAN NOT NULL DEFAULT false,
    "hidePhone" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "about" TEXT,
    "investment_preferences" JSONB,
    "ticket_size_min" DECIMAL(15,2),
    "ticket_size_max" DECIMAL(15,2),
    "portfolio" JSONB,
    "investment_stages" JSONB,
    "industries_of_interest" JSONB,
    "address" TEXT,
    "city" TEXT,
    "zipCode" TEXT,
    "links" JSONB,
    "country_id" INTEGER,
    "state_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_investor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_freelancer_profiles_user_id_key" ON "public"."scd_freelancer_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_freelancer_profiles_unique_id_key" ON "public"."scd_freelancer_profiles"("unique_id");

-- CreateIndex
CREATE INDEX "scd_freelancer_profiles_unique_id_idx" ON "public"."scd_freelancer_profiles"("unique_id");

-- CreateIndex
CREATE INDEX "scd_freelancer_profiles_user_id_idx" ON "public"."scd_freelancer_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_company_profiles_user_id_key" ON "public"."scd_company_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_company_profiles_unique_id_key" ON "public"."scd_company_profiles"("unique_id");

-- CreateIndex
CREATE INDEX "scd_company_profiles_unique_id_idx" ON "public"."scd_company_profiles"("unique_id");

-- CreateIndex
CREATE INDEX "scd_company_profiles_user_id_idx" ON "public"."scd_company_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_mentor_profiles_user_id_key" ON "public"."scd_mentor_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_mentor_profiles_unique_id_key" ON "public"."scd_mentor_profiles"("unique_id");

-- CreateIndex
CREATE INDEX "scd_mentor_profiles_unique_id_idx" ON "public"."scd_mentor_profiles"("unique_id");

-- CreateIndex
CREATE INDEX "scd_mentor_profiles_user_id_idx" ON "public"."scd_mentor_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_investor_profiles_user_id_key" ON "public"."scd_investor_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_investor_profiles_unique_id_key" ON "public"."scd_investor_profiles"("unique_id");

-- CreateIndex
CREATE INDEX "scd_investor_profiles_unique_id_idx" ON "public"."scd_investor_profiles"("unique_id");

-- CreateIndex
CREATE INDEX "scd_investor_profiles_user_id_idx" ON "public"."scd_investor_profiles"("user_id");

-- AddForeignKey
ALTER TABLE "public"."scd_freelancer_profiles" ADD CONSTRAINT "scd_freelancer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_freelancer_profiles" ADD CONSTRAINT "scd_freelancer_profiles_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."scd_countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_freelancer_profiles" ADD CONSTRAINT "scd_freelancer_profiles_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."scd_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_company_profiles" ADD CONSTRAINT "scd_company_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_company_profiles" ADD CONSTRAINT "scd_company_profiles_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."scd_countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_company_profiles" ADD CONSTRAINT "scd_company_profiles_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."scd_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_mentor_profiles" ADD CONSTRAINT "scd_mentor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_mentor_profiles" ADD CONSTRAINT "scd_mentor_profiles_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."scd_countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_mentor_profiles" ADD CONSTRAINT "scd_mentor_profiles_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."scd_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_investor_profiles" ADD CONSTRAINT "scd_investor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_investor_profiles" ADD CONSTRAINT "scd_investor_profiles_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."scd_countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_investor_profiles" ADD CONSTRAINT "scd_investor_profiles_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."scd_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;
