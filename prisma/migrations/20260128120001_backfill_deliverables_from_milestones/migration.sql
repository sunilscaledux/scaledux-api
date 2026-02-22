-- Backfill: only when both tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scd_milestones')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scd_deliverables') THEN
    INSERT INTO "scd_deliverables" (
      "unique_id", "milestone_id", "order_index", "description", "status", "submitted_file", "created_at", "updated_at"
    )
    SELECT
      gen_random_uuid()::text,
      m.id,
      (t.ord - 1)::integer,
      COALESCE(NULLIF(trim(t.elem->>'deliverable'), ''), NULLIF(trim(t.elem::text), ''), 'Deliverable')::varchar(500),
      'PENDING',
      '[]'::jsonb,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    FROM "scd_milestones" m,
         jsonb_array_elements(m.deliverables) WITH ORDINALITY AS t(elem, ord)
    WHERE m.deliverables IS NOT NULL
      AND jsonb_array_length(m.deliverables) > 0
      AND NOT EXISTS (SELECT 1 FROM "scd_deliverables" d WHERE d.milestone_id = m.id);
  END IF;
END $$;
