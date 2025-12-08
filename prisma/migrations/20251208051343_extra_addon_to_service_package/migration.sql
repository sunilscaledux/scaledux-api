-- AlterTable
ALTER TABLE "public"."service_packages" ADD COLUMN     "extra_add_ons" JSONB NOT NULL DEFAULT '[]';
