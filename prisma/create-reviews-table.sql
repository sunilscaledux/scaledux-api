-- Create scd_reviews table if it does not exist (e.g. when migration was not applied).
-- Run this manually if you get: The table `public.scd_reviews` does not exist

CREATE TABLE IF NOT EXISTS "scd_reviews" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "review_from_id" INTEGER NOT NULL,
    "review_to_id" INTEGER NOT NULL,
    "action_type" VARCHAR(50) NOT NULL,
    "action_id" VARCHAR(100) NOT NULL,
    "review_type" VARCHAR(20) NOT NULL,
    "rating" DECIMAL(3,2) NOT NULL,
    "feedback" TEXT,
    "end_reason" VARCHAR(255),
    "ratings_extra" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "scd_reviews_unique_id_key" ON "scd_reviews"("unique_id");
CREATE UNIQUE INDEX IF NOT EXISTS "scd_reviews_review_from_id_review_to_id_action_type_action_id_review_type_key"
    ON "scd_reviews"("review_from_id", "review_to_id", "action_type", "action_id", "review_type");
CREATE INDEX IF NOT EXISTS "scd_reviews_review_to_id_action_type_idx" ON "scd_reviews"("review_to_id", "action_type");
CREATE INDEX IF NOT EXISTS "scd_reviews_action_type_action_id_idx" ON "scd_reviews"("action_type", "action_id");

ALTER TABLE "scd_reviews" DROP CONSTRAINT IF EXISTS "scd_reviews_review_from_id_fkey";
ALTER TABLE "scd_reviews" ADD CONSTRAINT "scd_reviews_review_from_id_fkey"
    FOREIGN KEY ("review_from_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "scd_reviews" DROP CONSTRAINT IF EXISTS "scd_reviews_review_to_id_fkey";
ALTER TABLE "scd_reviews" ADD CONSTRAINT "scd_reviews_review_to_id_fkey"
    FOREIGN KEY ("review_to_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
