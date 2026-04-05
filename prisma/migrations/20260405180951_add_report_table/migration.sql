-- CreateTable
CREATE TABLE "scd_report_spam" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "reporter_id" INTEGER NOT NULL,
    "reported_user_id" INTEGER NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_report_spam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_report_spam_unique_id_key" ON "scd_report_spam"("unique_id");

-- CreateIndex
CREATE INDEX "scd_report_spam_reported_user_id_idx" ON "scd_report_spam"("reported_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_report_spam_reporter_id_reported_user_id_key" ON "scd_report_spam"("reporter_id", "reported_user_id");

-- AddForeignKey
ALTER TABLE "scd_report_spam" ADD CONSTRAINT "scd_report_spam_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_report_spam" ADD CONSTRAINT "scd_report_spam_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
