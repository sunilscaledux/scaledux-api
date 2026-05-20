/*
  Warnings:

  - You are about to drop the column `disconnected_by` on the `scd_connections` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "scd_connections" DROP COLUMN "disconnected_by";

-- CreateTable
CREATE TABLE "scd_blocked_users" (
    "id" SERIAL NOT NULL,
    "blocker_id" INTEGER NOT NULL,
    "blocked_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_blocked_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scd_blocked_users_blocked_user_id_idx" ON "scd_blocked_users"("blocked_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_blocked_users_blocker_id_blocked_user_id_key" ON "scd_blocked_users"("blocker_id", "blocked_user_id");

-- AddForeignKey
ALTER TABLE "scd_blocked_users" ADD CONSTRAINT "scd_blocked_users_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_blocked_users" ADD CONSTRAINT "scd_blocked_users_blocked_user_id_fkey" FOREIGN KEY ("blocked_user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
