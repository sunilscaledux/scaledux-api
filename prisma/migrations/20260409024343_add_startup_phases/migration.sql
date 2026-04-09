-- CreateTable
CREATE TABLE "scd_startup_phases" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "index" INTEGER NOT NULL,
    "display_index" VARCHAR(10) NOT NULL,
    "industry_id" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "short_name" VARCHAR(100) NOT NULL,
    "objective" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_startup_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_startup_phase_activities" (
    "id" SERIAL NOT NULL,
    "phase_id" INTEGER NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_startup_phase_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_startup_phase_deliverables" (
    "id" SERIAL NOT NULL,
    "phase_id" INTEGER NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_startup_phase_deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scd_user_startup_progress" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "current_phase_key" VARCHAR(50),
    "completed_activities" JSONB NOT NULL DEFAULT '[]',
    "deliverables" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scd_user_startup_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scd_startup_phases_key_key" ON "scd_startup_phases"("key");

-- CreateIndex
CREATE INDEX "scd_startup_phases_industry_id_idx" ON "scd_startup_phases"("industry_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_startup_phase_activities_key_key" ON "scd_startup_phase_activities"("key");

-- CreateIndex
CREATE INDEX "scd_startup_phase_activities_phase_id_type_idx" ON "scd_startup_phase_activities"("phase_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "scd_startup_phase_deliverables_key_key" ON "scd_startup_phase_deliverables"("key");

-- CreateIndex
CREATE INDEX "scd_startup_phase_deliverables_phase_id_idx" ON "scd_startup_phase_deliverables"("phase_id");

-- CreateIndex
CREATE UNIQUE INDEX "scd_user_startup_progress_user_id_key" ON "scd_user_startup_progress"("user_id");

-- AddForeignKey
ALTER TABLE "scd_startup_phase_activities" ADD CONSTRAINT "scd_startup_phase_activities_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "scd_startup_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_startup_phase_deliverables" ADD CONSTRAINT "scd_startup_phase_deliverables_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "scd_startup_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scd_user_startup_progress" ADD CONSTRAINT "scd_user_startup_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scd_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
