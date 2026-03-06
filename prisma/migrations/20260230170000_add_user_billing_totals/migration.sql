-- AlterTable
ALTER TABLE "scd_users" ADD COLUMN IF NOT EXISTS "total_earning" DECIMAL(15,2);
ALTER TABLE "scd_users" ADD COLUMN IF NOT EXISTS "total_withdrawal" DECIMAL(15,2);
ALTER TABLE "scd_users" ADD COLUMN IF NOT EXISTS "wallet_amount" DECIMAL(15,2);
ALTER TABLE "scd_users" ADD COLUMN IF NOT EXISTS "pending_amount" DECIMAL(15,2);

-- Backfill from existing transactions
UPDATE scd_users u SET
  total_earning = COALESCE((SELECT SUM(amount) FROM scd_billing_transactions WHERE to_id = u.id AND status = 'completed'), 0),
  total_withdrawal = COALESCE((SELECT SUM(amount) FROM scd_billing_transactions WHERE from_id = u.id AND type = 'withdrawal' AND status = 'completed'), 0),
  wallet_amount = COALESCE((
    SELECT SUM(CASE WHEN to_id = u.id THEN amount ELSE -amount END)
    FROM scd_billing_transactions
    WHERE (from_id = u.id OR to_id = u.id) AND status = 'completed'
  ), 0),
  pending_amount = COALESCE((SELECT SUM(amount) FROM scd_billing_transactions WHERE to_id = u.id AND status = 'pending'), 0)
WHERE EXISTS (SELECT 1 FROM scd_billing_transactions t WHERE t.from_id = u.id OR t.to_id = u.id);
