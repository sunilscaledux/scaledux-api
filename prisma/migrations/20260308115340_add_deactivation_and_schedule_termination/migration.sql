-- AlterEnum
ALTER TYPE "public"."OtpType" ADD VALUE 'DEACTIVATE_ACCOUNT';

-- AlterTable
ALTER TABLE "public"."scd_users" ADD COLUMN     "is_deactivated" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."scd_schedule_termination" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "scd_schedule_termination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_schedule_termination_user_id_key" ON "public"."scd_schedule_termination"("user_id");

-- CreateIndex
CREATE INDEX "scd_schedule_termination_scheduled_at_idx" ON "public"."scd_schedule_termination"("scheduled_at");

-- AddForeignKey
ALTER TABLE "public"."scd_schedule_termination" ADD CONSTRAINT "scd_schedule_termination_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
