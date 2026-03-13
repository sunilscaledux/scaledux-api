-- Drop remark_reason: we store only the display message in remark (reason label + optional message).
ALTER TABLE "scd_proposals" DROP COLUMN IF EXISTS "remark_reason";
