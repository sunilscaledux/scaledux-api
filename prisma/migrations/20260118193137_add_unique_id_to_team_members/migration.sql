/*
  Warnings:

  - A unique constraint covering the columns `[unique_id]` on the table `scd_team_members` will be added. If there are existing duplicate values, this will fail.
  - The required column `unique_id` was added to the `scd_team_members` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable - Add column as nullable first
ALTER TABLE "public"."scd_team_members" ADD COLUMN "unique_id" TEXT;

-- Populate existing rows with unique cuid values
UPDATE "public"."scd_team_members" 
SET "unique_id" = 'clx' || substr(md5(random()::text || clock_timestamp()::text), 1, 22)
WHERE "unique_id" IS NULL;

-- Make column NOT NULL
ALTER TABLE "public"."scd_team_members" ALTER COLUMN "unique_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "scd_team_members_unique_id_key" ON "public"."scd_team_members"("unique_id");

-- CreateIndex
CREATE INDEX "scd_team_members_unique_id_idx" ON "public"."scd_team_members"("unique_id");
