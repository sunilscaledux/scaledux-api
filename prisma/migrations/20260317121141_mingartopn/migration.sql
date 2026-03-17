-- CreateIndex
CREATE INDEX "scd_skills_expertise_category_id_idx" ON "public"."scd_skills"("expertise_category_id");

-- CreateIndex
CREATE INDEX "scd_specialties_expertise_category_id_idx" ON "public"."scd_specialties"("expertise_category_id");
