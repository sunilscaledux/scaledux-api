/*
  Warnings:

  - You are about to drop the `service_package_media` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."service_package_media" DROP CONSTRAINT "service_package_media_service_package_id_fkey";

-- DropTable
DROP TABLE "public"."service_package_media";
