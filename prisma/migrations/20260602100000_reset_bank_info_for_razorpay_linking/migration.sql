-- Clear all bank information so users re-verify, which now auto-creates Razorpay linked accounts
DELETE FROM "scd_bank_information";

-- Clear stale Razorpay IDs so they get re-created on next bank verification
UPDATE "scd_users"
SET "razorpay_contact_id" = NULL,
    "razorpay_account_id" = NULL
WHERE "razorpay_contact_id" IS NOT NULL
   OR "razorpay_account_id" IS NOT NULL;
