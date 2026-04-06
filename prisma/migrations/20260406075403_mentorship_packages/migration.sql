-- CreateTable
CREATE TABLE "scd_mentor_packages" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "session_duration" INTEGER NOT NULL,
    "no_of_sessions" INTEGER NOT NULL,
    "session_price_amount" DECIMAL(10,2) NOT NULL,
    "session_price_currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "recording_enabled" BOOLEAN NOT NULL DEFAULT false,
    "recording_type" VARCHAR(10),
    "recording_price_amount" DECIMAL(10,2),
    "recording_price_currency" VARCHAR(10),
    "category_id" INTEGER NOT NULL,
    "topics" JSONB NOT NULL DEFAULT '[]',
    "expected_outcomes" JSONB NOT NULL DEFAULT '[]',
    "mentees_expectations" JSONB NOT NULL DEFAULT '[]',
    "terms_and_conditions" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_mentor_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_mentor_packages_unique_id_key" ON "scd_mentor_packages"("unique_id");

-- CreateIndex
CREATE INDEX "scd_mentor_packages_user_id_idx" ON "scd_mentor_packages"("user_id");

-- CreateIndex
CREATE INDEX "scd_mentor_packages_category_id_idx" ON "scd_mentor_packages"("category_id");

-- CreateIndex
CREATE INDEX "scd_mentor_packages_status_idx" ON "scd_mentor_packages"("status");

-- AddForeignKey
ALTER TABLE "scd_mentor_packages" ADD CONSTRAINT "scd_mentor_packages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_mentor_packages" ADD CONSTRAINT "scd_mentor_packages_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "scd_expertise_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
