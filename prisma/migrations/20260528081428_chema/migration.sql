-- AlterTable
ALTER TABLE "scd_bookings" ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "completion_reason" VARCHAR(120),
ADD COLUMN     "completion_remark" TEXT,
ADD COLUMN     "completion_success" BOOLEAN;
