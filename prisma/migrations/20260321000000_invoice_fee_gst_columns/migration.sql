-- AlterTable: add fee, gst_amount, platform_gst, sender_gst, receiver_gst to scd_invoices
ALTER TABLE "scd_invoices" ADD COLUMN "platform_gst" VARCHAR(50);
ALTER TABLE "scd_invoices" ADD COLUMN "sender_gst" VARCHAR(50);
ALTER TABLE "scd_invoices" ADD COLUMN "receiver_gst" VARCHAR(50);
ALTER TABLE "scd_invoices" ADD COLUMN "fee" DECIMAL(10,2);
ALTER TABLE "scd_invoices" ADD COLUMN "gst_amount" DECIMAL(10,2);
