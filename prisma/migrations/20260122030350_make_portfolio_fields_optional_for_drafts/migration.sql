-- DropForeignKey
ALTER TABLE "public"."scd_portfolios" DROP CONSTRAINT "scd_portfolios_industry_id_fkey";

-- AlterTable
ALTER TABLE "public"."scd_portfolios" ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "company_name" DROP NOT NULL,
ALTER COLUMN "industry_id" DROP NOT NULL,
ALTER COLUMN "project_skills" DROP NOT NULL,
ALTER COLUMN "completion_month" DROP NOT NULL,
ALTER COLUMN "completion_year" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."scd_portfolios" ADD CONSTRAINT "scd_portfolios_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "public"."scd_industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
