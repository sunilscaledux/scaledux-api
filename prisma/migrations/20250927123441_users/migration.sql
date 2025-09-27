/*
  Warnings:

  - You are about to drop the column `f_name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `l_name` on the `users` table. All the data in the column will be lost.
  - Added the required column `FirstName` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."users_f_name_l_name_email_idx";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "f_name",
DROP COLUMN "l_name",
ADD COLUMN     "FirstName" TEXT NOT NULL,
ADD COLUMN     "LastName" TEXT;

-- CreateIndex
CREATE INDEX "users_LastName_FirstName_email_idx" ON "public"."users"("LastName", "FirstName", "email");
