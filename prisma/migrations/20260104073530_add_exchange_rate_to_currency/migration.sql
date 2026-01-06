-- AlterTable
ALTER TABLE "public"."scd_currencies" ADD COLUMN     "exchange_rate" DECIMAL(10,6) NOT NULL DEFAULT 1.0;
