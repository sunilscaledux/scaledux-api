-- CreateTable
CREATE TABLE "scd_bug_reports" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "reporter_id" INTEGER NOT NULL,
    "steps" TEXT NOT NULL,
    "page_url" VARCHAR(1024),
    "user_agent" TEXT,
    "screen_size" VARCHAR(32),
    "recording_attachment_id" VARCHAR(36),
    "recording_duration_seconds" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "admin_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_bug_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_bug_reports_unique_id_key" ON "scd_bug_reports"("unique_id");

-- CreateIndex
CREATE INDEX "scd_bug_reports_reporter_id_idx" ON "scd_bug_reports"("reporter_id");

-- CreateIndex
CREATE INDEX "scd_bug_reports_status_idx" ON "scd_bug_reports"("status");

-- CreateIndex
CREATE INDEX "scd_bug_reports_created_at_idx" ON "scd_bug_reports"("created_at");

-- AddForeignKey
ALTER TABLE "scd_bug_reports" ADD CONSTRAINT "scd_bug_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
