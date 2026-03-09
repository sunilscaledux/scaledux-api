-- CreateTable: section + email preferences (moved from scd_users)
CREATE TABLE "scd_user_preferences" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "profile_sections" JSONB,
    "email_notification_preferences" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_user_preferences_pkey" PRIMARY KEY ("id")
);

-- Backfill from users
INSERT INTO "scd_user_preferences" ("user_id", "profile_sections", "email_notification_preferences", "updated_at")
SELECT "id", "profile_sections", "email_notification_preferences", NOW()
FROM "scd_users"
WHERE "profile_sections" IS NOT NULL OR "email_notification_preferences" IS NOT NULL;

-- Create unique index for one-to-one
CREATE UNIQUE INDEX "scd_user_preferences_user_id_key" ON "scd_user_preferences"("user_id");

-- AddForeignKey
ALTER TABLE "scd_user_preferences" ADD CONSTRAINT "scd_user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop columns from users
ALTER TABLE "scd_users" DROP COLUMN IF EXISTS "profile_sections";
ALTER TABLE "scd_users" DROP COLUMN IF EXISTS "email_notification_preferences";
