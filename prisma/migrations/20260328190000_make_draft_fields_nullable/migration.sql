-- AlterTable: make FounderProject fields nullable for draft support (only title required)
ALTER TABLE "scd_founder_projects" ALTER COLUMN "project_description" DROP NOT NULL;
ALTER TABLE "scd_founder_projects" ALTER COLUMN "expertise_category_id" DROP NOT NULL;
ALTER TABLE "scd_founder_projects" ALTER COLUMN "scope_of_work" DROP NOT NULL;
ALTER TABLE "scd_founder_projects" ALTER COLUMN "experience_needed" DROP NOT NULL;
ALTER TABLE "scd_founder_projects" ALTER COLUMN "budget_currency" DROP NOT NULL;
ALTER TABLE "scd_founder_projects" ALTER COLUMN "budget_amount" DROP NOT NULL;
ALTER TABLE "scd_founder_projects" ALTER COLUMN "skills_required" SET DEFAULT '[]';
