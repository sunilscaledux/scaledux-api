-- AlterTable
ALTER TABLE "public"."temp_users" ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."users" ALTER COLUMN "email" DROP NOT NULL;
