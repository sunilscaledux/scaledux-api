/*
  Warnings:

  - You are about to drop the column `cancel_reason` on the `scd_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `completion_reason` on the `scd_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `completion_remark` on the `scd_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `completion_success` on the `scd_bookings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "scd_bookings" DROP COLUMN "cancel_reason",
DROP COLUMN "completion_reason",
DROP COLUMN "completion_remark",
DROP COLUMN "completion_success",
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "rejected_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "scd_booking_activities" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "reason" VARCHAR(120),
    "remark" TEXT,
    "acted_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_booking_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scd_booking_activities_booking_id_idx" ON "scd_booking_activities"("booking_id");

-- CreateIndex
CREATE INDEX "scd_booking_activities_acted_by_idx" ON "scd_booking_activities"("acted_by");

-- AddForeignKey
ALTER TABLE "scd_booking_activities" ADD CONSTRAINT "scd_booking_activities_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "scd_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_booking_activities" ADD CONSTRAINT "scd_booking_activities_acted_by_fkey" FOREIGN KEY ("acted_by") REFERENCES "scd_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
