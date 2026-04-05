-- CreateTable
CREATE TABLE "scd_saved_mentors" (
    "id" SERIAL NOT NULL,
    "mentor_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_saved_mentors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scd_saved_mentors_mentor_id_idx" ON "scd_saved_mentors"("mentor_id");

-- CreateIndex
CREATE INDEX "scd_saved_mentors_user_id_idx" ON "scd_saved_mentors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_saved_mentors_mentor_id_user_id_key" ON "scd_saved_mentors"("mentor_id", "user_id");

-- AddForeignKey
ALTER TABLE "scd_saved_mentors" ADD CONSTRAINT "scd_saved_mentors_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_saved_mentors" ADD CONSTRAINT "scd_saved_mentors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
