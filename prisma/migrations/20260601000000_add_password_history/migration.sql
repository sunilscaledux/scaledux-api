-- CreateTable: append-only audit + reuse-check log of every bcrypt
-- password hash a user has ever had set on their account.
CREATE TABLE IF NOT EXISTS "scd_password_history" (
    "id"         SERIAL PRIMARY KEY,
    "user_id"    INTEGER NOT NULL,
    "password"   TEXT NOT NULL,
    "source"     VARCHAR(32) NOT NULL,
    "ip_address" VARCHAR(64),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scd_password_history_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "scd_users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "scd_password_history_user_id_created_at_idx"
  ON "scd_password_history"("user_id", "created_at");
