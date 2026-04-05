/*
  Warnings:

  - You are about to drop the column `main_reason` on the `scd_proposals` table. All the data in the column will be lost.
  - You are about to drop the column `remark` on the `scd_proposals` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."scd_proposals" DROP COLUMN "main_reason",
DROP COLUMN "remark",
ADD COLUMN     "founder_reason" VARCHAR(50),
ADD COLUMN     "founder_remark" TEXT,
ADD COLUMN     "freelancer_reason" VARCHAR(50),
ADD COLUMN     "freelancer_remark" TEXT;

-- AddForeignKey
ALTER TABLE "public"."scd_notifications" ADD CONSTRAINT "scd_notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."scd_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
