/*
  Warnings:

  - You are about to drop the column `submitted_at` on the `scd_milestones` table. All the data in the column will be lost.
  - You are about to drop the column `submitted_file` on the `scd_milestones` table. All the data in the column will be lost.
  - You are about to drop the column `submitted_remark` on the `scd_milestones` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."scd_milestones" DROP COLUMN "submitted_at",
DROP COLUMN "submitted_file",
DROP COLUMN "submitted_remark";
