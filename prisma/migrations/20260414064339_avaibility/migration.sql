-- CreateTable
CREATE TABLE "scd_availability" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    "schedule" JSONB NOT NULL,
    "unavailability" JSONB,
    "rest_break" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_availability_user_id_key" ON "scd_availability"("user_id");

-- AddForeignKey
ALTER TABLE "scd_availability" ADD CONSTRAINT "scd_availability_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
