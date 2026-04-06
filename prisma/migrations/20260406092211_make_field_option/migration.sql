-- AlterTable
ALTER TABLE "scd_mentor_packages" ALTER COLUMN "session_duration" DROP NOT NULL,
ALTER COLUMN "no_of_sessions" DROP NOT NULL,
ALTER COLUMN "session_price_amount" DROP NOT NULL,
ALTER COLUMN "session_price_currency" DROP NOT NULL,
ALTER COLUMN "category_id" DROP NOT NULL;
