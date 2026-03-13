-- CreateTable
CREATE TABLE "scd_activities" (
    "id" SERIAL NOT NULL,
    "subject_type" VARCHAR(80) NOT NULL,
    "subject_unique_id" VARCHAR(64) NOT NULL,
    "type" VARCHAR(80) NOT NULL,
    "payload" JSONB NOT NULL,
    "created_by_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scd_activities_subject_type_subject_unique_id_created_at_idx" ON "scd_activities"("subject_type", "subject_unique_id", "created_at" DESC);
