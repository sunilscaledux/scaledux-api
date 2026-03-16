/*
  Warnings:

  - The `sender_status` column on the `scd_billing_transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `receiver_status` column on the `scd_billing_transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `admin_status` column on the `scd_billing_transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `status` on the `scd_withdrawal_requests` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."BillingTransactionSenderStatus" AS ENUM ('funded', 'completed', 'released');

-- CreateEnum
CREATE TYPE "public"."BillingTransactionReceiverStatus" AS ENUM ('pending', 'completed', 'released', 'withdraw_in_process', 'paid_out');

-- CreateEnum
CREATE TYPE "public"."BillingTransactionAdminStatus" AS ENUM ('loaded', 'sent_to_freelancer', 'success');

-- CreateEnum
CREATE TYPE "public"."WithdrawalRequestStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- AlterTable
ALTER TABLE "public"."scd_billing_transactions" DROP COLUMN "sender_status",
ADD COLUMN     "sender_status" "public"."BillingTransactionSenderStatus",
DROP COLUMN "receiver_status",
ADD COLUMN     "receiver_status" "public"."BillingTransactionReceiverStatus",
DROP COLUMN "admin_status",
ADD COLUMN     "admin_status" "public"."BillingTransactionAdminStatus";

-- AlterTable
ALTER TABLE "public"."scd_proposal_ndas" ALTER COLUMN "offer_expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "nda_sent_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "nda_signed_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "nda_downloaded_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."scd_withdrawal_requests" DROP COLUMN "status",
ADD COLUMN     "status" "public"."WithdrawalRequestStatus" NOT NULL;

-- CreateTable
CREATE TABLE "public"."scd_attachments" (
    "id" SERIAL NOT NULL,
    "unique_id" VARCHAR(36) NOT NULL,
    "owner_user_id" INTEGER NOT NULL,
    "uploaded_by_user_id" INTEGER NOT NULL,
    "disk" VARCHAR(20) NOT NULL,
    "path" VARCHAR(512) NOT NULL,
    "visibility" VARCHAR(20) NOT NULL,
    "access_type" VARCHAR(40),
    "mime_type" VARCHAR(128),
    "size_bytes" INTEGER,
    "original_name" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'attached',
    "accessible_user_ids" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "scd_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_attachments_unique_id_key" ON "public"."scd_attachments"("unique_id");

-- CreateIndex
CREATE INDEX "scd_attachments_owner_user_id_idx" ON "public"."scd_attachments"("owner_user_id");

-- CreateIndex
CREATE INDEX "scd_attachments_unique_id_idx" ON "public"."scd_attachments"("unique_id");

-- CreateIndex
CREATE INDEX "scd_attachments_status_idx" ON "public"."scd_attachments"("status");

-- CreateIndex
CREATE INDEX "scd_withdrawal_requests_status_idx" ON "public"."scd_withdrawal_requests"("status");

-- AddForeignKey
ALTER TABLE "public"."scd_attachments" ADD CONSTRAINT "scd_attachments_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_attachments" ADD CONSTRAINT "scd_attachments_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
