-- AlterTable: widen action column from VARCHAR(20) to VARCHAR(50)
-- to support longer keys like MEETING_LINK_REQUESTED, LINK_REMINDER_DAILY_YYYY-MM-DD
ALTER TABLE "scd_booking_activities" ALTER COLUMN "action" TYPE VARCHAR(50);
