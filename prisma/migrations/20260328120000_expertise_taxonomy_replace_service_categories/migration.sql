-- Ensure at least one expertise category exists for backfill
INSERT INTO "scd_expertise_categories" ("name", "description", "is_active", "created_at", "updated_at")
SELECT 'General', 'Default category for migrated data', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "scd_expertise_categories" LIMIT 1);

-- Founder projects (old sub_category ids do not map to specialties — new nullable specialty_id)
ALTER TABLE "scd_founder_projects" DROP CONSTRAINT IF EXISTS "scd_founder_projects_category_id_fkey";
ALTER TABLE "scd_founder_projects" DROP CONSTRAINT IF EXISTS "scd_founder_projects_sub_category_id_fkey";

ALTER TABLE "scd_founder_projects" ADD COLUMN "expertise_category_id" INTEGER;

UPDATE "scd_founder_projects"
SET "expertise_category_id" = (SELECT id FROM "scd_expertise_categories" ORDER BY id ASC LIMIT 1);

ALTER TABLE "scd_founder_projects" DROP COLUMN "category_id";
ALTER TABLE "scd_founder_projects" DROP COLUMN "sub_category_id";

ALTER TABLE "scd_founder_projects" ALTER COLUMN "expertise_category_id" SET NOT NULL;

ALTER TABLE "scd_founder_projects" ADD COLUMN "specialty_id" INTEGER;

ALTER TABLE "scd_founder_projects"
  ADD CONSTRAINT "scd_founder_projects_expertise_category_id_fkey"
  FOREIGN KEY ("expertise_category_id") REFERENCES "scd_expertise_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scd_founder_projects"
  ADD CONSTRAINT "scd_founder_projects_specialty_id_fkey"
  FOREIGN KEY ("specialty_id") REFERENCES "scd_specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "scd_founder_projects_category_id_idx";
DROP INDEX IF EXISTS "scd_founder_projects_sub_category_id_idx";
CREATE INDEX "scd_founder_projects_expertise_category_id_idx" ON "scd_founder_projects"("expertise_category_id");
CREATE INDEX "scd_founder_projects_specialty_id_idx" ON "scd_founder_projects"("specialty_id");

-- Service packages
ALTER TABLE "scd_service_packages" DROP CONSTRAINT IF EXISTS "scd_service_packages_category_id_fkey";
ALTER TABLE "scd_service_packages" DROP CONSTRAINT IF EXISTS "scd_service_packages_sub_category_id_fkey";

ALTER TABLE "scd_service_packages" ADD COLUMN "expertise_category_id" INTEGER;
ALTER TABLE "scd_service_packages" ADD COLUMN "specialty_id_pkg" INTEGER;
ALTER TABLE "scd_service_packages" ADD COLUMN "skill_ids" JSONB NOT NULL DEFAULT '[]';

UPDATE "scd_service_packages"
SET "expertise_category_id" = (SELECT id FROM "scd_expertise_categories" ORDER BY id ASC LIMIT 1);

ALTER TABLE "scd_service_packages" ALTER COLUMN "expertise_category_id" SET NOT NULL;

ALTER TABLE "scd_service_packages" DROP COLUMN "category_id";
ALTER TABLE "scd_service_packages" DROP COLUMN "sub_category_id";
ALTER TABLE "scd_service_packages" DROP COLUMN "keywords";

ALTER TABLE "scd_service_packages" RENAME COLUMN "specialty_id_pkg" TO "specialty_id";

ALTER TABLE "scd_service_packages"
  ADD CONSTRAINT "scd_service_packages_expertise_category_id_fkey"
  FOREIGN KEY ("expertise_category_id") REFERENCES "scd_expertise_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scd_service_packages"
  ADD CONSTRAINT "scd_service_packages_specialty_id_fkey"
  FOREIGN KEY ("specialty_id") REFERENCES "scd_specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "scd_service_packages_category_id_idx";
DROP INDEX IF EXISTS "scd_service_packages_sub_category_id_idx";
CREATE INDEX "scd_service_packages_expertise_category_id_idx" ON "scd_service_packages"("expertise_category_id");
CREATE INDEX "scd_service_packages_specialty_id_idx" ON "scd_service_packages"("specialty_id");

DROP TABLE IF EXISTS "scd_service_keywords";
DROP TABLE IF EXISTS "scd_service_sub_categories";
DROP TABLE IF EXISTS "scd_service_categories";
