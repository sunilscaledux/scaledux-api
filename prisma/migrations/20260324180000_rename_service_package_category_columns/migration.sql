-- Rename expertise_category_id to category_id
ALTER TABLE "scd_service_packages" RENAME COLUMN "expertise_category_id" TO "category_id";

-- Rename specialty_id to sub_category_id
ALTER TABLE "scd_service_packages" RENAME COLUMN "specialty_id" TO "sub_category_id";
