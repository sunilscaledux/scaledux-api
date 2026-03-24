-- Remove foreign key constraint from scd_team_members to scd_team_roles
ALTER TABLE "scd_team_members" DROP CONSTRAINT IF EXISTS "scd_team_members_role_id_fkey";

-- Migrate role_id to role text by looking up the role name
ALTER TABLE "scd_team_members" ADD COLUMN "role" TEXT;

UPDATE "scd_team_members" SET "role" = tr."name"
FROM "scd_team_roles" tr
WHERE "scd_team_members"."role_id" = tr."id";

-- Set default for any rows without a matching role
UPDATE "scd_team_members" SET "role" = 'Member' WHERE "role" IS NULL;

-- Make role NOT NULL now that all rows have a value
ALTER TABLE "scd_team_members" ALTER COLUMN "role" SET NOT NULL;

-- Drop the old role_id column
ALTER TABLE "scd_team_members" DROP COLUMN "role_id";

-- Add is_cofounder column
ALTER TABLE "scd_team_members" ADD COLUMN "is_cofounder" BOOLEAN NOT NULL DEFAULT false;

-- Drop the scd_team_roles table
DROP TABLE IF EXISTS "scd_team_roles";
