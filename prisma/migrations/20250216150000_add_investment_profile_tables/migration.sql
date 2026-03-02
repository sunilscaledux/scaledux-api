-- CreateTable
CREATE TABLE "scd_investment_profiles" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "investor_types" JSONB,
    "thesis_summary" TEXT,
    "diligence_process" TEXT,
    "diligence_document" TEXT,
    "investment_size_min" DECIMAL(15,2),
    "investment_size_max" DECIMAL(15,2),
    "investment_size_currency" TEXT,
    "equity_range_min" INTEGER,
    "equity_range_max" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_investment_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_investment_profile_preferred_industries" (
    "id" SERIAL NOT NULL,
    "investment_profile_id" INTEGER NOT NULL,
    "industry_id" INTEGER NOT NULL,
    "sub_industry_id" INTEGER,
    "specialisation" VARCHAR(500),
    "investment_stage" VARCHAR(255),
    "investment_criteria" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_investment_profile_preferred_industries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_investment_profile_committee_members" (
    "id" SERIAL NOT NULL,
    "unique_id" TEXT NOT NULL,
    "investment_profile_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" VARCHAR(255),
    "role_description" TEXT,
    "photo" TEXT,
    "email" VARCHAR(255),
    "hide_email" BOOLEAN NOT NULL DEFAULT false,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_investment_profile_committee_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_investment_profile_geo_preferences" (
    "id" SERIAL NOT NULL,
    "investment_profile_id" INTEGER NOT NULL,
    "country_id" INTEGER NOT NULL,
    "state_id" INTEGER,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_investment_profile_geo_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_investment_profiles_unique_id_key" ON "scd_investment_profiles"("unique_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_investment_profiles_user_id_key" ON "scd_investment_profiles"("user_id");

-- CreateIndex
CREATE INDEX "scd_investment_profiles_user_id_idx" ON "scd_investment_profiles"("user_id");

-- CreateIndex
CREATE INDEX "scd_investment_profile_preferred_industries_investment_profile_id_idx" ON "scd_investment_profile_preferred_industries"("investment_profile_id");

-- CreateIndex
CREATE INDEX "scd_investment_profile_preferred_industries_industry_id_idx" ON "scd_investment_profile_preferred_industries"("industry_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_investment_profile_committee_members_unique_id_key" ON "scd_investment_profile_committee_members"("unique_id");

-- CreateIndex
CREATE INDEX "scd_investment_profile_committee_members_investment_profile_id_idx" ON "scd_investment_profile_committee_members"("investment_profile_id");

-- CreateIndex
CREATE INDEX "scd_investment_profile_geo_preferences_investment_profile_id_idx" ON "scd_investment_profile_geo_preferences"("investment_profile_id");

-- CreateIndex
CREATE INDEX "scd_investment_profile_geo_preferences_country_id_idx" ON "scd_investment_profile_geo_preferences"("country_id");

-- AddForeignKey
ALTER TABLE "scd_investment_profiles" ADD CONSTRAINT "scd_investment_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_investment_profile_preferred_industries" ADD CONSTRAINT "scd_investment_profile_preferred_industries_investment_profile_id_fkey" FOREIGN KEY ("investment_profile_id") REFERENCES "scd_investment_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_investment_profile_preferred_industries" ADD CONSTRAINT "scd_investment_profile_preferred_industries_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "scd_industries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_investment_profile_preferred_industries" ADD CONSTRAINT "scd_investment_profile_preferred_industries_sub_industry_id_fkey" FOREIGN KEY ("sub_industry_id") REFERENCES "scd_sub_industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_investment_profile_committee_members" ADD CONSTRAINT "scd_investment_profile_committee_members_investment_profile_id_fkey" FOREIGN KEY ("investment_profile_id") REFERENCES "scd_investment_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_investment_profile_geo_preferences" ADD CONSTRAINT "scd_investment_profile_geo_preferences_investment_profile_id_fkey" FOREIGN KEY ("investment_profile_id") REFERENCES "scd_investment_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_investment_profile_geo_preferences" ADD CONSTRAINT "scd_investment_profile_geo_preferences_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "scd_countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_investment_profile_geo_preferences" ADD CONSTRAINT "scd_investment_profile_geo_preferences_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "scd_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;
