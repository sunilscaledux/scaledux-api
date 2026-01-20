-- CreateTable: Founder Projects
-- This table stores project posts created by founders to hire freelancers

CREATE TABLE IF NOT EXISTS "scd_founder_projects" (
    "id" SERIAL PRIMARY KEY,
    "unique_id" VARCHAR(255) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    "user_id" INTEGER NOT NULL,
    "project_title" VARCHAR(50) NOT NULL,
    "project_description" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "sub_category_id" INTEGER,
    "project_files" JSONB DEFAULT '[]'::jsonb,
    "scope_of_work" TEXT NOT NULL,
    "skills_required" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "experience_needed" VARCHAR(50) NOT NULL,
    "budget_currency" VARCHAR(10) NOT NULL,
    "budget_amount" VARCHAR(20) NOT NULL,
    "is_nda_required" BOOLEAN NOT NULL DEFAULT false,
    "screening_questions" JSONB DEFAULT '[]'::jsonb,
    "advanced_preferences" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "invited_count" INTEGER NOT NULL DEFAULT 0,
    "proposals_count" INTEGER NOT NULL DEFAULT 0,
    "hired_count" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_founder_projects_user" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_founder_projects_category" FOREIGN KEY ("category_id") REFERENCES "scd_service_categories"("id"),
    CONSTRAINT "fk_founder_projects_sub_category" FOREIGN KEY ("sub_category_id") REFERENCES "scd_service_sub_categories"("id")
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_founder_projects_user_id" ON "scd_founder_projects"("user_id");
CREATE INDEX IF NOT EXISTS "idx_founder_projects_status" ON "scd_founder_projects"("status");
CREATE INDEX IF NOT EXISTS "idx_founder_projects_user_status" ON "scd_founder_projects"("user_id", "status");
CREATE INDEX IF NOT EXISTS "idx_founder_projects_category_id" ON "scd_founder_projects"("category_id");
CREATE INDEX IF NOT EXISTS "idx_founder_projects_sub_category_id" ON "scd_founder_projects"("sub_category_id");
CREATE INDEX IF NOT EXISTS "idx_founder_projects_deleted_at" ON "scd_founder_projects"("deleted_at");
CREATE INDEX IF NOT EXISTS "idx_founder_projects_created_at" ON "scd_founder_projects"("created_at" DESC);

-- Add check constraint for status
ALTER TABLE "scd_founder_projects" 
ADD CONSTRAINT "chk_founder_projects_status" 
CHECK ("status" IN ('DRAFT', 'PUBLISHED'));

-- Add comment to table
COMMENT ON TABLE "scd_founder_projects" IS 'Stores project posts created by founders to hire freelancers';
COMMENT ON COLUMN "scd_founder_projects"."advanced_preferences" IS 'JSON object containing english_level, hire_within, time_requirement, earned_amount, location';
COMMENT ON COLUMN "scd_founder_projects"."screening_questions" IS 'Array of screening question objects';
COMMENT ON COLUMN "scd_founder_projects"."project_files" IS 'Array of project file URLs';
