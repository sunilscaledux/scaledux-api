-- CreateTable: wallet and billing totals (moved from scd_users)
CREATE TABLE "scd_user_wallets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "wallet_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_earning" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_withdrawal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "pending_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_user_wallets_pkey" PRIMARY KEY ("id")
);

-- Backfill: one row per user (use COALESCE for nulls)
INSERT INTO "scd_user_wallets" ("user_id", "wallet_amount", "total_earning", "total_withdrawal", "pending_amount", "updated_at")
SELECT
    "id",
    COALESCE("wallet_amount", 0),
    COALESCE("total_earning", 0),
    COALESCE("total_withdrawal", 0),
    COALESCE("pending_amount", 0),
    NOW()
FROM "scd_users";

CREATE UNIQUE INDEX "scd_user_wallets_user_id_key" ON "scd_user_wallets"("user_id");

ALTER TABLE "scd_user_wallets" ADD CONSTRAINT "scd_user_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop columns from users
ALTER TABLE "scd_users" DROP COLUMN IF EXISTS "wallet_amount";
ALTER TABLE "scd_users" DROP COLUMN IF EXISTS "total_earning";
ALTER TABLE "scd_users" DROP COLUMN IF EXISTS "total_withdrawal";
ALTER TABLE "scd_users" DROP COLUMN IF EXISTS "pending_amount";
