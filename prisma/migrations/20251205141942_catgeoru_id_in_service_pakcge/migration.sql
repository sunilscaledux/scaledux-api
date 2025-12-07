/*
  Warnings:

  - You are about to drop the column `category` on the `service_packages` table. All the data in the column will be lost.
  - You are about to drop the column `sub_category` on the `service_packages` table. All the data in the column will be lost.
  - Added the required column `category_id` to the `service_packages` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."service_packages_category_idx";

-- AlterTable
ALTER TABLE "public"."service_packages" DROP COLUMN "category",
DROP COLUMN "sub_category",
ADD COLUMN     "category_id" INTEGER NOT NULL,
ADD COLUMN     "sub_category_id" INTEGER;

-- CreateIndex
CREATE INDEX "service_packages_category_id_idx" ON "public"."service_packages"("category_id");

-- CreateIndex
CREATE INDEX "service_packages_sub_category_id_idx" ON "public"."service_packages"("sub_category_id");

-- AddForeignKey
ALTER TABLE "public"."service_packages" ADD CONSTRAINT "service_packages_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_packages" ADD CONSTRAINT "service_packages_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "public"."service_sub_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
