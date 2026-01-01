/*
  Warnings:

  - You are about to drop the column `thumbnail_urls` on the `scd_portfolios` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."scd_portfolios" DROP COLUMN "thumbnail_urls",
ADD COLUMN     "thumbnail_url" TEXT;
