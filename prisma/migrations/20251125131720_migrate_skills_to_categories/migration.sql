/*
  Warnings:

  - A unique constraint covering the columns `[name,expertise_category_id]` on the table `skills` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."skills" DROP CONSTRAINT "skills_specialty_id_fkey";

-- AlterTable
ALTER TABLE "public"."skills" ADD COLUMN     "expertise_category_id" INTEGER,
ALTER COLUMN "specialty_id" DROP NOT NULL;

-- Migrate existing skills from specialties to their parent expertise categories
UPDATE "public"."skills" 
SET "expertise_category_id" = (
  SELECT "expertise_category_id" 
  FROM "public"."specialties" 
  WHERE "specialties"."id" = "skills"."specialty_id"
)
WHERE "specialty_id" IS NOT NULL;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "agency_verification_status" TEXT DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "public"."agency_verifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "agency_name" TEXT NOT NULL,
    "cin" TEXT NOT NULL,
    "document_urls" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "reviewed_by" INTEGER,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agency_verifications_user_id_status_idx" ON "public"."agency_verifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "agency_verifications_status_idx" ON "public"."agency_verifications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_expertise_category_id_key" ON "public"."skills"("name", "expertise_category_id");

-- AddForeignKey
ALTER TABLE "public"."skills" ADD CONSTRAINT "skills_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."skills" ADD CONSTRAINT "skills_expertise_category_id_fkey" FOREIGN KEY ("expertise_category_id") REFERENCES "public"."expertise_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agency_verifications" ADD CONSTRAINT "agency_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
