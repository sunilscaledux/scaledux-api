-- AlterTable
ALTER TABLE "scd_users" ADD COLUMN     "deactivated_at" TIMESTAMP(3),
ADD COLUMN     "deactivated_reason" TEXT;
