/*
  Warnings:

  - You are about to drop the column `specialty_id` on the `skills` table. All the data in the column will be lost.
  - Made the column `expertise_category_id` on table `skills` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."skills" DROP CONSTRAINT "skills_expertise_category_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."skills" DROP CONSTRAINT "skills_specialty_id_fkey";

-- DropIndex
DROP INDEX "public"."skills_name_specialty_id_key";

-- AlterTable
ALTER TABLE "public"."skills" DROP COLUMN "specialty_id",
ALTER COLUMN "expertise_category_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."skills" ADD CONSTRAINT "skills_expertise_category_id_fkey" FOREIGN KEY ("expertise_category_id") REFERENCES "public"."expertise_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
