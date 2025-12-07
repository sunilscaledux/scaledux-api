/*
  Warnings:

  - You are about to drop the column `industry` on the `service_packages` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."service_packages" DROP COLUMN "industry",
ADD COLUMN     "documents" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "images" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "industries" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "thumbnail" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "video" JSONB NOT NULL DEFAULT '[]';
