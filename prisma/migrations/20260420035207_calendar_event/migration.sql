-- AlterTable
ALTER TABLE "scd_users" ADD COLUMN     "google_calendar_connected_at" TIMESTAMP(3),
ADD COLUMN     "google_calendar_email" VARCHAR(255),
ADD COLUMN     "google_calendar_refresh_token" TEXT;
