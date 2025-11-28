/*
  Warnings:

  - A unique constraint covering the columns `[unique_id]` on the table `portfolios` will be added. If there are existing duplicate values, this will fail.
  - The required column `unique_id` was added to the `portfolios` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "public"."portfolios" ADD COLUMN     "unique_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "portfolios_unique_id_key" ON "public"."portfolios"("unique_id");
