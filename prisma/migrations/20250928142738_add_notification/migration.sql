-- AlterTable
ALTER TABLE "public"."temp_users" ADD COLUMN     "notification" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "notification" BOOLEAN NOT NULL DEFAULT false;
