-- AlterTable
ALTER TABLE "scd_invoices" ALTER COLUMN "gst_number" SET DATA TYPE TEXT,
ALTER COLUMN "sender_gst" SET DATA TYPE TEXT,
ALTER COLUMN "receiver_gst" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "scd_tax_information" ALTER COLUMN "pan_number" SET DATA TYPE TEXT,
ALTER COLUMN "gstin" SET DATA TYPE TEXT;
