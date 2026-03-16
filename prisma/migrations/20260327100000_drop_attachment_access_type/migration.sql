-- Drop access_type from scd_attachments; access is checked by id/ownership instead.
ALTER TABLE "scd_attachments" DROP COLUMN IF EXISTS "access_type";
