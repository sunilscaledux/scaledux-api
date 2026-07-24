-- CreateTable
CREATE TABLE "scd_booking_moms" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_booking_moms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_booking_moms_booking_id_user_id_key" ON "scd_booking_moms"("booking_id", "user_id");

-- AddForeignKey
ALTER TABLE "scd_booking_moms" ADD CONSTRAINT "scd_booking_moms_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "scd_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_booking_moms" ADD CONSTRAINT "scd_booking_moms_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
