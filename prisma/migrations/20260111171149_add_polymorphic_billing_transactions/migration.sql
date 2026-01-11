/*
  Warnings:

  - You are about to drop the column `user_id` on the `scd_billing_transactions` table. All the data in the column will be lost.
  - Added the required column `actor_id` to the `scd_billing_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actor_type` to the `scd_billing_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `from_id` to the `scd_billing_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `from_type` to the `scd_billing_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject_id` to the `scd_billing_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject_type` to the `scd_billing_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `to_id` to the `scd_billing_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `to_type` to the `scd_billing_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."scd_billing_transactions" DROP CONSTRAINT "scd_billing_transactions_user_id_fkey";

-- DropIndex
DROP INDEX "public"."scd_billing_transactions_currency_id_idx";

-- DropIndex
DROP INDEX "public"."scd_billing_transactions_user_id_idx";

-- AlterTable
ALTER TABLE "public"."scd_billing_transactions" DROP COLUMN "user_id",
ADD COLUMN     "actor_id" INTEGER NOT NULL,
ADD COLUMN     "actor_type" VARCHAR(50) NOT NULL,
ADD COLUMN     "from_id" INTEGER NOT NULL,
ADD COLUMN     "from_type" VARCHAR(50) NOT NULL,
ADD COLUMN     "subject_id" INTEGER NOT NULL,
ADD COLUMN     "subject_type" VARCHAR(50) NOT NULL,
ADD COLUMN     "to_id" INTEGER NOT NULL,
ADD COLUMN     "to_type" VARCHAR(50) NOT NULL,
ALTER COLUMN "type" SET DATA TYPE VARCHAR(30);

-- CreateIndex
CREATE INDEX "scd_billing_transactions_actor_type_actor_id_idx" ON "public"."scd_billing_transactions"("actor_type", "actor_id");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_from_type_from_id_idx" ON "public"."scd_billing_transactions"("from_type", "from_id");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_to_type_to_id_idx" ON "public"."scd_billing_transactions"("to_type", "to_id");

-- CreateIndex
CREATE INDEX "scd_billing_transactions_subject_type_subject_id_idx" ON "public"."scd_billing_transactions"("subject_type", "subject_id");
