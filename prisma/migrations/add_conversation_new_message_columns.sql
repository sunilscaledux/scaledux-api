-- Add new_message tracking per participant. Run once: psql -d your_db -f prisma/migrations/add_conversation_new_message_columns.sql
ALTER TABLE "scd_conversations"
  ADD COLUMN IF NOT EXISTS "user1_has_new_message" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "user2_has_new_message" BOOLEAN NOT NULL DEFAULT false;
