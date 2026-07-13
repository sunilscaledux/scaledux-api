import { Router } from "express";
import { BugReportController } from "./BugReportController";
import { authenticateToken } from "@middleware/auth";
import { FileUpload, handleMulterError } from "@middleware/fileupload";

const router = Router();

router.use(authenticateToken);

// Optional screen+mic recording (.webm) is streamed to the Bunny private zone.
const uploadRecording = FileUpload({
  uploadPath: "bug-reports",
  fieldName: "bug_report_recording",
  fileFilter: "milestoneDeliverable", // allows audio/* and video/* (incl. webm)
  maxSize: 100, // MB
  maxFiles: 1,
});

router.post("/", uploadRecording.single("recording"), BugReportController.create, handleMulterError);

export default router;
