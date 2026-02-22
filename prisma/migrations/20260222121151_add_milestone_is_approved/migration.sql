-- AlterTable
ALTER TABLE "public"."scd_milestones" ADD COLUMN     "is_approved" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."scd_proposals" ADD COLUMN     "milestones_approved" BOOLEAN NOT NULL DEFAULT false;
