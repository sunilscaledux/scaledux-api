-- AlterTable
ALTER TABLE "public"."scd_service_packages" ALTER COLUMN "thumbnail" DROP NOT NULL,
ALTER COLUMN "thumbnail" DROP DEFAULT,
ALTER COLUMN "thumbnail" SET DATA TYPE TEXT;
