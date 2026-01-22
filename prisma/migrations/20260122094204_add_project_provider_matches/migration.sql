-- AlterTable
ALTER TABLE "public"."scd_users" ALTER COLUMN "role" DROP DEFAULT;

-- CreateTable
CREATE TABLE "public"."scd_project_provider_matches" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "matched_skills" JSONB NOT NULL,
    "match_score" DOUBLE PRECISION NOT NULL,
    "is_invited" BOOLEAN NOT NULL DEFAULT false,
    "invited_at" TIMESTAMP(3),
    "invitation_message" TEXT,
    "is_saved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_project_provider_matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scd_project_provider_matches_project_id_idx" ON "public"."scd_project_provider_matches"("project_id");

-- CreateIndex
CREATE INDEX "scd_project_provider_matches_provider_id_idx" ON "public"."scd_project_provider_matches"("provider_id");

-- CreateIndex
CREATE INDEX "scd_project_provider_matches_is_invited_idx" ON "public"."scd_project_provider_matches"("is_invited");

-- CreateIndex
CREATE INDEX "scd_project_provider_matches_match_score_idx" ON "public"."scd_project_provider_matches"("match_score");

-- CreateIndex
CREATE UNIQUE INDEX "scd_project_provider_matches_project_id_provider_id_key" ON "public"."scd_project_provider_matches"("project_id", "provider_id");

-- AddForeignKey
ALTER TABLE "public"."scd_project_provider_matches" ADD CONSTRAINT "scd_project_provider_matches_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."scd_founder_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_project_provider_matches" ADD CONSTRAINT "scd_project_provider_matches_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
