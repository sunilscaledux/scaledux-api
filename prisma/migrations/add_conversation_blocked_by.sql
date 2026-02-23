-- Add blocked_by_user_id for block/unblock. Run once.
ALTER TABLE "scd_conversations"
  ADD COLUMN IF NOT EXISTS "blocked_by_user_id" INTEGER NULL;
