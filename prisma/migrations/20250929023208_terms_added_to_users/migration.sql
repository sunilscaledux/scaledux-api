-- AlterTable
ALTER TABLE "public"."temp_users" ADD COLUMN     "terms" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "terms" BOOLEAN NOT NULL DEFAULT true;
