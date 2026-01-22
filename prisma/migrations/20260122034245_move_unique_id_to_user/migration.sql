/*
  Warnings:

  - You are about to drop the column `unique_id` on the `scd_personal_info` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[unique_id]` on the table `scd_users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."scd_personal_info_unique_id_idx";

-- DropIndex
DROP INDEX "public"."scd_personal_info_unique_id_key";

-- AlterTable
ALTER TABLE "public"."scd_personal_info" DROP COLUMN "unique_id";

-- AlterTable
ALTER TABLE "public"."scd_users" ADD COLUMN     "unique_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "scd_users_unique_id_key" ON "public"."scd_users"("unique_id");
