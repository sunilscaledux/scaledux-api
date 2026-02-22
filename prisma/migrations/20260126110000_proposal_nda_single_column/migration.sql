-- Add single NDA JSON column: only if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scd_proposals') THEN
    ALTER TABLE "scd_proposals" ADD COLUMN IF NOT EXISTS "nda" JSONB;

    UPDATE "scd_proposals"
    SET "nda" = jsonb_build_object(
      'offer_expires_at', to_jsonb("offer_expires_at"),
      'is_nda_signed', COALESCE("is_nda_signed", false),
      'nda_file_link', "nda_file_link",
      'nda_sent_at', to_jsonb("nda_sent_at"),
      'nda_signed_at', to_jsonb("nda_signed_at"),
      'nda_signed_file_link', "nda_signed_file_link",
      'nda_downloaded_at', null
    )
    WHERE "nda" IS NULL;

    ALTER TABLE "scd_proposals"
      DROP COLUMN IF EXISTS "offer_expires_at",
      DROP COLUMN IF EXISTS "is_nda_signed",
      DROP COLUMN IF EXISTS "nda_file_link",
      DROP COLUMN IF EXISTS "nda_sent_at",
      DROP COLUMN IF EXISTS "nda_signed_at",
      DROP COLUMN IF EXISTS "nda_signed_file_link";
  END IF;
END $$;
