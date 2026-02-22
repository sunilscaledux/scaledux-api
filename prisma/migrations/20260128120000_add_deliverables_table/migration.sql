-- CreateTable: only if scd_milestones exists (FK reference)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scd_milestones') THEN
    CREATE TABLE IF NOT EXISTS "scd_deliverables" (
        "id" SERIAL PRIMARY KEY,
        "unique_id" VARCHAR(255) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
        "milestone_id" INTEGER NOT NULL,
        "order_index" INTEGER NOT NULL DEFAULT 0,
        "description" VARCHAR(500) NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        "submitted_at" TIMESTAMPTZ,
        "submitted_remark" TEXT,
        "submitted_file" JSONB NOT NULL DEFAULT '[]',
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "fk_deliverables_milestone" FOREIGN KEY ("milestone_id") REFERENCES "scd_milestones"("id") ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "scd_deliverables_milestone_order_key" ON "scd_deliverables"("milestone_id", "order_index");
    CREATE INDEX IF NOT EXISTS "scd_deliverables_milestone_id_idx" ON "scd_deliverables"("milestone_id");
  END IF;
END $$;
