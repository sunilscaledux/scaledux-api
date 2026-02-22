-- Only run when scd_conversations exists (skip if tables missing)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scd_conversations') THEN
    ALTER TABLE "scd_conversations" DROP CONSTRAINT IF EXISTS "scd_conversations_project_id_fkey";

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scd_messages') THEN
      DELETE FROM "scd_messages"
      WHERE "conversation_id" IN (
        SELECT "id" FROM "scd_conversations" "c1"
        WHERE EXISTS (
          SELECT 1 FROM "scd_conversations" "c2"
          WHERE "c2"."user1_id" = "c1"."user1_id" AND "c2"."user2_id" = "c1"."user2_id" AND "c2"."id" > "c1"."id"
        )
      );
    END IF;

    DELETE FROM "scd_conversations" "c1"
    WHERE EXISTS (
      SELECT 1 FROM "scd_conversations" "c2"
      WHERE "c2"."user1_id" = "c1"."user1_id" AND "c2"."user2_id" = "c1"."user2_id" AND "c2"."id" > "c1"."id"
    );

    ALTER TABLE "scd_conversations" DROP CONSTRAINT IF EXISTS "scd_conversations_user1_id_user2_id_project_id_key";
    DROP INDEX IF EXISTS "scd_conversations_project_id_idx";
    ALTER TABLE "scd_conversations" DROP COLUMN IF EXISTS "project_id";

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scd_conversations_user1_id_user2_id_key') THEN
      ALTER TABLE "scd_conversations" ADD CONSTRAINT "scd_conversations_user1_id_user2_id_key" UNIQUE ("user1_id", "user2_id");
    END IF;
  END IF;
END $$;
