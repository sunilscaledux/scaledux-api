-- AlterTable
ALTER TABLE "public"."scd_billing_transactions" ADD COLUMN     "milestone_id" INTEGER;

-- CreateIndex
CREATE INDEX "scd_billing_transactions_milestone_id_idx" ON "public"."scd_billing_transactions"("milestone_id");

-- AddForeignKey
ALTER TABLE "public"."scd_billing_transactions" ADD CONSTRAINT "scd_billing_transactions_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "public"."scd_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
