-- CreateTable
CREATE TABLE "scd_reviews" (
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_reviews_unique_id_key" ON "scd_reviews"("unique_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_reviews_review_from_id_review_to_id_action_type_action_id_review_type_key" ON "scd_reviews"("review_from_id", "review_to_id", "action_type", "action_id", "review_type");

-- CreateIndex
CREATE INDEX "scd_reviews_review_to_id_action_type_idx" ON "scd_reviews"("review_to_id", "action_type");

-- CreateIndex
CREATE INDEX "scd_reviews_action_type_action_id_idx" ON "scd_reviews"("action_type", "action_id");

-- AddForeignKey
ALTER TABLE "scd_reviews" ADD CONSTRAINT "scd_reviews_review_from_id_fkey" FOREIGN KEY ("review_from_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_reviews" ADD CONSTRAINT "scd_reviews_review_to_id_fkey" FOREIGN KEY ("review_to_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
