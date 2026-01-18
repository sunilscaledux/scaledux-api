/*
  Warnings:

  - You are about to drop the column `hideEmail` on the `scd_company_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `hidePhone` on the `scd_company_profiles` table. All the data in the column will be lost.
  - You are about to drop the `scd_investor_profiles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `scd_mentor_profiles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."scd_investor_profiles" DROP CONSTRAINT "scd_investor_profiles_country_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scd_investor_profiles" DROP CONSTRAINT "scd_investor_profiles_state_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scd_investor_profiles" DROP CONSTRAINT "scd_investor_profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scd_mentor_profiles" DROP CONSTRAINT "scd_mentor_profiles_country_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scd_mentor_profiles" DROP CONSTRAINT "scd_mentor_profiles_state_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scd_mentor_profiles" DROP CONSTRAINT "scd_mentor_profiles_user_id_fkey";

-- AlterTable
ALTER TABLE "public"."scd_company_profiles" DROP COLUMN "hideEmail",
DROP COLUMN "hidePhone";

-- DropTable
DROP TABLE "public"."scd_investor_profiles";

-- DropTable
DROP TABLE "public"."scd_mentor_profiles";

-- CreateTable
CREATE TABLE "public"."scd_sub_industries" (
    "id" SERIAL NOT NULL,
    "industry_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_sub_industries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scd_business_models" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_business_models_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scd_sub_industries_industry_id_idx" ON "public"."scd_sub_industries"("industry_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_sub_industries_industry_id_name_key" ON "public"."scd_sub_industries"("industry_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_business_models_name_key" ON "public"."scd_business_models"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scd_business_models_code_key" ON "public"."scd_business_models"("code");

-- AddForeignKey
ALTER TABLE "public"."scd_sub_industries" ADD CONSTRAINT "scd_sub_industries_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "public"."scd_industries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
