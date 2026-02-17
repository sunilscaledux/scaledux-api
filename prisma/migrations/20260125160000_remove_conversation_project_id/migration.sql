-- Drop FK from Conversation to FounderProject
ALTER TABLE "scd_conversations" DROP CONSTRAINT IF EXISTS "scd_conversations_project_id_fkey";

-- Deduplicate: keep one conversation per (user1_id, user2_id), delete others and their messages
DELETE FROM "scd_messages"
WHERE "conversation_id" IN (
  SELECT "id" FROM "scd_conversations" "c1"
  WHERE EXISTS (
    SELECT 1 FROM "scd_conversations" "c2"
    WHERE "c2"."user1_id" = "c1"."user1_id"
      AND "c2"."user2_id" = "c1"."user2_id"
      AND "c2"."id" > "c1"."id"
  )
);

DELETE FROM "scd_conversations" "c1"
WHERE EXISTS (
  SELECT 1 FROM "scd_conversations" "c2"
  WHERE "c2"."user1_id" = "c1"."user1_id"
    AND "c2"."user2_id" = "c1"."user2_id"
    AND "c2"."id" > "c1"."id"
);

-- Drop old unique (user1_id, user2_id, project_id)
ALTER TABLE "scd_conversations" DROP CONSTRAINT IF EXISTS "scd_conversations_user1_id_user2_id_project_id_key";

-- Drop index on project_id if exists
DROP INDEX IF EXISTS "scd_conversations_project_id_idx";

-- Drop project_id column
ALTER TABLE "scd_conversations" DROP COLUMN IF EXISTS "project_id";

-- Add new unique: one conversation per user pair
ALTER TABLE "scd_conversations" ADD CONSTRAINT "scd_conversations_user1_id_user2_id_key" UNIQUE ("user1_id", "user2_id");
