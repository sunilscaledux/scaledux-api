-- CreateTable
CREATE TABLE "scd_newsletter_subscribers" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'SUBSCRIBED',
    "source" VARCHAR(30) NOT NULL DEFAULT 'landing',
    "ip_address" VARCHAR(45),
    "unsubscribed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_newsletter_subscribers_unique_id_key" ON "scd_newsletter_subscribers"("unique_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_newsletter_subscribers_email_key" ON "scd_newsletter_subscribers"("email");

-- CreateIndex
CREATE INDEX "scd_newsletter_subscribers_status_idx" ON "scd_newsletter_subscribers"("status");

-- CreateIndex
CREATE INDEX "scd_newsletter_subscribers_role_idx" ON "scd_newsletter_subscribers"("role");

-- CreateIndex
CREATE INDEX "scd_newsletter_subscribers_created_at_idx" ON "scd_newsletter_subscribers"("created_at");
