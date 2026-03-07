-- CreateTable
CREATE TABLE "public"."scd_notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" VARCHAR(80) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "body" TEXT,
    "link" VARCHAR(1024),
    "read_at" TIMESTAMP(3),
    "actor_id" INTEGER,
    "subject_type" VARCHAR(80),
    "subject_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scd_notifications_user_id_idx" ON "public"."scd_notifications"("user_id");

-- CreateIndex
CREATE INDEX "scd_notifications_user_id_read_at_idx" ON "public"."scd_notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "scd_notifications_created_at_idx" ON "public"."scd_notifications"("created_at");

-- AddForeignKey
ALTER TABLE "public"."scd_notifications" ADD CONSTRAINT "scd_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
