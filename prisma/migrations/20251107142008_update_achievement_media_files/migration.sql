/*
  Warnings:

  - You are about to drop the column `media_urls` on the `achievements` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."achievements" DROP COLUMN "media_urls",
ADD COLUMN     "media_files" JSONB;
