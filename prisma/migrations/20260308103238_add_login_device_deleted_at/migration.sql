-- AlterTable
ALTER TABLE "public"."scd_login_devices" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "scd_login_devices_deleted_at_idx" ON "public"."scd_login_devices"("deleted_at");
