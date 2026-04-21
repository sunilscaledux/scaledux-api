-- AlterTable
ALTER TABLE "scd_bookings" ADD COLUMN     "meeting_link" VARCHAR(500),
ADD COLUMN     "meeting_provider" VARCHAR(20);

-- AlterTable
ALTER TABLE "scd_mentor_on_request" ADD COLUMN     "default_meeting_provider" VARCHAR(20);

-- AlterTable
ALTER TABLE "scd_users" ADD COLUMN     "ms_teams_connected_at" TIMESTAMP(3),
ADD COLUMN     "ms_teams_email" VARCHAR(255),
ADD COLUMN     "ms_teams_refresh_token" TEXT,
ADD COLUMN     "zoom_connected_at" TIMESTAMP(3),
ADD COLUMN     "zoom_email" VARCHAR(255),
ADD COLUMN     "zoom_refresh_token" TEXT;
