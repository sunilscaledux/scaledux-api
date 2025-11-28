-- AlterTable
ALTER TABLE "public"."portfolios" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "portfolios_deleted_at_idx" ON "public"."portfolios"("deleted_at");
