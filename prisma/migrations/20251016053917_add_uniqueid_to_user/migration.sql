/*
  Warnings:

  - A unique constraint covering the columns `[uniqueId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "uniqueId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_uniqueId_key" ON "public"."users"("uniqueId");
