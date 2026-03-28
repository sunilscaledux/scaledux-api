-- AlterTable
ALTER TABLE "scd_company_profiles" ADD COLUMN "is_registered" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "scd_company_profiles" ADD COLUMN "is_branch_same_as_hq" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "scd_company_profiles" ADD COLUMN "branch_address" TEXT;
ALTER TABLE "scd_company_profiles" ADD COLUMN "branch_address_line_2" TEXT;
ALTER TABLE "scd_company_profiles" ADD COLUMN "branch_city" TEXT;
ALTER TABLE "scd_company_profiles" ADD COLUMN "branch_zipCode" TEXT;
ALTER TABLE "scd_company_profiles" ADD COLUMN "branch_country_id" INTEGER;
ALTER TABLE "scd_company_profiles" ADD COLUMN "branch_state_id" INTEGER;

-- AddForeignKey
ALTER TABLE "scd_company_profiles" ADD CONSTRAINT "scd_company_profiles_branch_country_id_fkey" FOREIGN KEY ("branch_country_id") REFERENCES "scd_countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_company_profiles" ADD CONSTRAINT "scd_company_profiles_branch_state_id_fkey" FOREIGN KEY ("branch_state_id") REFERENCES "scd_states"("id") ON DELETE SET NULL ON UPDATE CASCADE;
