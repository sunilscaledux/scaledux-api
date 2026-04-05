/*
  Warnings:

  - You are about to drop the column `agency_gstin` on the `scd_tax_information` table. All the data in the column will be lost.
  - You are about to drop the column `agency_gstin_api_response` on the `scd_tax_information` table. All the data in the column will be lost.
  - You are about to drop the column `agency_gstin_failure_reason` on the `scd_tax_information` table. All the data in the column will be lost.
  - You are about to drop the column `agency_gstin_status` on the `scd_tax_information` table. All the data in the column will be lost.
  - You are about to drop the column `agency_gstin_verified_at` on the `scd_tax_information` table. All the data in the column will be lost.
  - You are about to drop the column `agency_name` on the `scd_tax_information` table. All the data in the column will be lost.
  - You are about to drop the column `agency_pan` on the `scd_tax_information` table. All the data in the column will be lost.
  - You are about to drop the column `individual_gstin` on the `scd_tax_information` table. All the data in the column will be lost.
  - You are about to drop the column `individual_gstin_api_response` on the `scd_tax_information` table. All the data in the column will be lost.
  - You are about to drop the column `individual_gstin_failure_reason` on the `scd_tax_information` table. All the data in the column will be lost.
  - You are about to drop the column `individual_gstin_status` on the `scd_tax_information` table. All the data in the column will be lost.
  - You are about to drop the column `individual_gstin_verified_at` on the `scd_tax_information` table. All the data in the column will be lost.
  - You are about to drop the column `individual_name` on the `scd_tax_information` table. All the data in the column will be lost.
  - You are about to drop the column `individual_pan` on the `scd_tax_information` table. All the data in the column will be lost.
  - You are about to alter the column `entity_type` on the `scd_tax_information` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - A unique constraint covering the columns `[user_id,entity_type]` on the table `scd_tax_information` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "scd_tax_information_user_id_key";

-- AlterTable
ALTER TABLE "scd_tax_information" DROP COLUMN "agency_gstin",
DROP COLUMN "agency_gstin_api_response",
DROP COLUMN "agency_gstin_failure_reason",
DROP COLUMN "agency_gstin_status",
DROP COLUMN "agency_gstin_verified_at",
DROP COLUMN "agency_name",
DROP COLUMN "agency_pan",
DROP COLUMN "individual_gstin",
DROP COLUMN "individual_gstin_api_response",
DROP COLUMN "individual_gstin_failure_reason",
DROP COLUMN "individual_gstin_status",
DROP COLUMN "individual_gstin_verified_at",
DROP COLUMN "individual_name",
DROP COLUMN "individual_pan",
ADD COLUMN     "gstin_api_response" JSONB,
ADD COLUMN     "gstin_failure_reason" VARCHAR(500),
ADD COLUMN     "gstin_status" VARCHAR(20) DEFAULT 'PENDING',
ADD COLUMN     "gstin_verified_at" TIMESTAMP(3),
ADD COLUMN     "name" VARCHAR(200),
ALTER COLUMN "entity_type" SET DATA TYPE VARCHAR(20);

-- CreateIndex
CREATE UNIQUE INDEX "scd_tax_information_user_id_entity_type_key" ON "scd_tax_information"("user_id", "entity_type");
