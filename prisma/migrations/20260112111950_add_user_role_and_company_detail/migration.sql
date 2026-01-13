-- AlterTable
ALTER TABLE "public"."scd_users" ADD COLUMN     "role" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "public"."scd_company_details" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "company_name" TEXT NOT NULL,
    "company_tagline" TEXT,
    "company_logo" TEXT,
    "company_cover_image" TEXT,
    "year_founded" INTEGER,
    "company_size" TEXT,
    "headquarters" TEXT,
    "company_location" TEXT,
    "company_website" TEXT,
    "industry" TEXT,
    "company_type" TEXT,
    "description" TEXT,
    "problem_statement" TEXT,
    "solution" TEXT,
    "target_market" TEXT,
    "unique_value_prop" TEXT,
    "business_model" TEXT,
    "revenue_model" TEXT,
    "funding_stage" TEXT,
    "total_funding" DOUBLE PRECISION,
    "seeking_funding" BOOLEAN NOT NULL DEFAULT false,
    "funding_amount" DOUBLE PRECISION,
    "currency_id" INTEGER,
    "country_id" INTEGER,
    "state_id" INTEGER,
    "social_links" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scd_company_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_company_details_user_id_key" ON "public"."scd_company_details"("user_id");

-- AddForeignKey
ALTER TABLE "public"."scd_company_details" ADD CONSTRAINT "scd_company_details_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_company_details" ADD CONSTRAINT "scd_company_details_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "public"."scd_currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_company_details" ADD CONSTRAINT "scd_company_details_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "public"."scd_countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scd_company_details" ADD CONSTRAINT "scd_company_details_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."scd_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;
