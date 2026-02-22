-- One-off fix: create scd_conversations if missing (migration was marked applied but table never created)
CREATE TABLE IF NOT EXISTS "scd_conversations" (
    "id" SERIAL PRIMARY KEY,
    "unique_id" VARCHAR(255) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    "user1_id" INTEGER NOT NULL,
    "user2_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'scd_conversations' AND constraint_name = 'scd_conversations_user1_id_fkey'
  ) THEN
    ALTER TABLE "scd_conversations" ADD CONSTRAINT "scd_conversations_user1_id_fkey"
      FOREIGN KEY ("user1_id") REFERENCES "scd_users"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'scd_conversations' AND constraint_name = 'scd_conversations_user2_id_fkey'
  ) THEN
    ALTER TABLE "scd_conversations" ADD CONSTRAINT "scd_conversations_user2_id_fkey"
      FOREIGN KEY ("user2_id") REFERENCES "scd_users"("id") ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE "scd_conversations" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20);

-- Unique constraint expected by schema (20260125160000 removes project_id and adds this)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scd_conversations_user1_id_user2_id_key'
  ) THEN
    ALTER TABLE "scd_conversations" ADD CONSTRAINT "scd_conversations_user1_id_user2_id_key" UNIQUE ("user1_id", "user2_id");
  END IF;
END $$;
