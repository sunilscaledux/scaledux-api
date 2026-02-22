-- Normalize chat system message metadata to a single activityId.
-- Rule: if proposalId (or proposal_id) exists use it, else use projectId (or project_id).
-- Removes projectId, proposalId, project_id, proposal_id from metadata.
-- Run once: psql -d your_db -f prisma/update-message-metadata-activity-id.sql

-- For PostgreSQL (column type json or jsonb):
UPDATE scd_messages
SET metadata = jsonb_set(
  (metadata::jsonb) - 'projectId' - 'proposalId' - 'project_id' - 'proposal_id',
  '{activityId}',
  COALESCE(
    (metadata::jsonb)->'proposalId',
    (metadata::jsonb)->'proposal_id',
    (metadata::jsonb)->'projectId',
    (metadata::jsonb)->'project_id'
  )
)::json
WHERE type = 'SYSTEM'
  AND metadata IS NOT NULL
  AND (
    (metadata::jsonb) ? 'projectId'
    OR (metadata::jsonb) ? 'proposalId'
    OR (metadata::jsonb) ? 'project_id'
    OR (metadata::jsonb) ? 'proposal_id'
  );

-- If your column is already jsonb (no need to cast back to json), use:
-- SET metadata = jsonb_set(...)  without the )::json at the end.
