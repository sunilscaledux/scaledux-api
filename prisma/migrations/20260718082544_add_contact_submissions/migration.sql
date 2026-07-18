-- CreateTable
CREATE TABLE "scd_contact_submissions" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "first_name" VARCHAR(20) NOT NULL,
    "last_name" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "reason" VARCHAR(20) NOT NULL,
    "subject" VARCHAR(100) NOT NULL,
    "message" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'NEW',
    "admin_note" TEXT,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_contact_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_contact_submissions_unique_id_key" ON "scd_contact_submissions"("unique_id");

-- CreateIndex
CREATE INDEX "scd_contact_submissions_status_idx" ON "scd_contact_submissions"("status");

-- CreateIndex
CREATE INDEX "scd_contact_submissions_created_at_idx" ON "scd_contact_submissions"("created_at");
