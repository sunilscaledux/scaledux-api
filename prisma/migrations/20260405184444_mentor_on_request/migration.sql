-- CreateTable
CREATE TABLE "scd_mentor_on_request" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT false,
    "session_frequency" JSONB,
    "session_duration_min" INTEGER,
    "session_duration_max" INTEGER,
    "price_amount" DECIMAL(10,2),
    "price_currency" VARCHAR(10) DEFAULT 'INR',
    "discount_enabled" BOOLEAN NOT NULL DEFAULT false,
    "discount_title" VARCHAR(200),
    "discount_percent" INTEGER,
    "discount_available_till" TIMESTAMP(3),
    "recording_enabled" BOOLEAN NOT NULL DEFAULT false,
    "recording_type" VARCHAR(10),
    "recording_amount" DECIMAL(10,2),
    "terms_and_conditions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_mentor_on_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_mentor_on_request_user_id_key" ON "scd_mentor_on_request"("user_id");

-- AddForeignKey
ALTER TABLE "scd_mentor_on_request" ADD CONSTRAINT "scd_mentor_on_request_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
