-- CreateTable
CREATE TABLE "scd_bookings" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "mentor_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "payment_status" VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency_id" INTEGER NOT NULL DEFAULT 1,
    "platform_fee" DECIMAL(12,2),
    "razorpay_order_id" VARCHAR(64),
    "meta" JSONB,
    "parent_id" INTEGER,
    "is_reschedule" BOOLEAN NOT NULL DEFAULT false,
    "rescheduled_by" INTEGER,
    "cancelled_by" INTEGER,
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_bookings_unique_id_key" ON "scd_bookings"("unique_id");

-- CreateIndex
CREATE INDEX "scd_bookings_mentor_id_scheduled_at_idx" ON "scd_bookings"("mentor_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "scd_bookings_user_id_status_idx" ON "scd_bookings"("user_id", "status");

-- CreateIndex
CREATE INDEX "scd_bookings_status_idx" ON "scd_bookings"("status");

-- CreateIndex
CREATE INDEX "scd_bookings_parent_id_idx" ON "scd_bookings"("parent_id");

-- AddForeignKey
ALTER TABLE "scd_bookings" ADD CONSTRAINT "scd_bookings_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "scd_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_bookings" ADD CONSTRAINT "scd_bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_bookings" ADD CONSTRAINT "scd_bookings_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "scd_currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_bookings" ADD CONSTRAINT "scd_bookings_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "scd_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
