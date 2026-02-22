-- Drop MilestoneDocument table: files are now stored per deliverable (Deliverable.submitted_file) or on milestone (Milestone.submitted_file)
DROP TABLE IF EXISTS "scd_milestone_documents";
