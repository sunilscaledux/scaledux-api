/*
  Warnings:

  - You are about to drop the column `industry` on the `portfolios` table. All the data in the column will be lost.
  - You are about to drop the column `tools_used` on the `portfolios` table. All the data in the column will be lost.
  - Added the required column `industry_id` to the `portfolios` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."portfolios" DROP COLUMN "industry",
DROP COLUMN "tools_used",
ADD COLUMN     "industry_id" INTEGER NOT NULL,
ALTER COLUMN "role" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."industries" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "industries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "industries_name_key" ON "public"."industries"("name");

-- CreateIndex
CREATE INDEX "portfolios_industry_id_idx" ON "public"."portfolios"("industry_id");

-- AddForeignKey
ALTER TABLE "public"."portfolios" ADD CONSTRAINT "portfolios_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
