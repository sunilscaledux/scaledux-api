/*
  Warnings:

  - A unique constraint covering the columns `[unique_id]` on the table `service_packages` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."service_packages" ADD COLUMN     "unique_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "service_packages_unique_id_key" ON "public"."service_packages"("unique_id");
