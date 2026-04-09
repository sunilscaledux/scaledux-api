-- DropIndex
DROP INDEX "scd_startup_phase_activities_key_key";
-- DropIndex
DROP INDEX "scd_startup_phase_deliverables_key_key";
-- DropIndex
DROP INDEX "scd_startup_phases_key_key";
-- AlterTable
ALTER TABLE "scd_startup_phase_activities" DROP COLUMN "key";
-- AlterTable
ALTER TABLE "scd_startup_phase_deliverables" DROP COLUMN "key";
-- AlterTable
ALTER TABLE "scd_startup_phases" DROP COLUMN "key";
-- AlterTable
ALTER TABLE "scd_user_startup_progress" DROP COLUMN "current_phase_key",
ADD COLUMN     "current_phase_id" INTEGER;
-- CreateIndex
CREATE UNIQUE INDEX "scd_startup_phase_activities_phase_id_type_order_key" ON "scd_startup_phase_activities"("phase_id", "type", "order");
-- CreateIndex
CREATE UNIQUE INDEX "scd_startup_phase_deliverables_phase_id_order_key" ON "scd_startup_phase_deliverables"("phase_id", "order");
-- CreateIndex
CREATE UNIQUE INDEX "scd_startup_phases_display_index_key" ON "scd_startup_phases"("display_index");
