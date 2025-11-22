/*
  Warnings:

  - A unique constraint covering the columns `[name,specialty_id]` on the table `skills` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,expertise_category_id]` on the table `specialties` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `specialty_id` to the `skills` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expertise_category_id` to the `specialties` table without a default value. This is not possible if the table is not empty.

*/

-- First, clear existing data to avoid conflicts
DELETE FROM "public"."user_expertises";
DELETE FROM "public"."skills";
DELETE FROM "public"."specialties";

-- DropIndex
DROP INDEX "public"."skills_name_key";

-- DropIndex
DROP INDEX "public"."specialties_name_key";

-- AlterTable
ALTER TABLE "public"."skills" ADD COLUMN     "specialty_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."specialties" ADD COLUMN     "expertise_category_id" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_specialty_id_key" ON "public"."skills"("name", "specialty_id");

-- CreateIndex
CREATE UNIQUE INDEX "specialties_name_expertise_category_id_key" ON "public"."specialties"("name", "expertise_category_id");

-- AddForeignKey
ALTER TABLE "public"."specialties" ADD CONSTRAINT "specialties_expertise_category_id_fkey" FOREIGN KEY ("expertise_category_id") REFERENCES "public"."expertise_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."skills" ADD CONSTRAINT "skills_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
