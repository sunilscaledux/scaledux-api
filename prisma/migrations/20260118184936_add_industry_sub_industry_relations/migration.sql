/*
  Warnings:

  - You are about to drop the column `industry` on the `scd_company_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."scd_company_profiles" DROP COLUMN "industry",
ADD COLUMN     "industry_id" INTEGER,
ADD COLUMN     "sub_industry_id" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."scd_company_profiles" ADD CONSTRAINT "scd_company_profiles_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "public"."scd_industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_company_profiles" ADD CONSTRAINT "scd_company_profiles_sub_industry_id_fkey" FOREIGN KEY ("sub_industry_id") REFERENCES "public"."scd_sub_industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
