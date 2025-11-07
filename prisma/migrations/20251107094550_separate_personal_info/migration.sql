/*
  Warnings:

  - You are about to drop the column `about` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `address_line_2` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `country_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `currency_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `hourly_rate` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `links` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `state_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `website` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `zipCode` on the `users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_country_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_currency_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_state_id_fkey";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "about",
DROP COLUMN "address",
DROP COLUMN "address_line_2",
DROP COLUMN "city",
DROP COLUMN "country_id",
DROP COLUMN "currency_id",
DROP COLUMN "hourly_rate",
DROP COLUMN "links",
DROP COLUMN "state_id",
DROP COLUMN "title",
DROP COLUMN "website",
DROP COLUMN "zipCode";

-- CreateTable
CREATE TABLE "public"."personal_info" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT,
    "about" TEXT,
    "address" TEXT,
    "address_line_2" TEXT,
    "city" TEXT,
    "website" TEXT,
    "zipCode" TEXT,
    "hourly_rate" DOUBLE PRECISION,
    "links" JSONB,
    "currency_id" INTEGER,
    "country_id" INTEGER,
    "state_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_info_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "personal_info_user_id_key" ON "public"."personal_info"("user_id");

-- AddForeignKey
ALTER TABLE "public"."personal_info" ADD CONSTRAINT "personal_info_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."personal_info" ADD CONSTRAINT "personal_info_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."personal_info" ADD CONSTRAINT "personal_info_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."personal_info" ADD CONSTRAINT "personal_info_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE SET NULL ON UPDATE CASCADE;
