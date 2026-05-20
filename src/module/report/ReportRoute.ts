import { Router } from "express";
import { createReport, checkReport, getMyReports, getAllReports, updateReportStatus, deleteReport, updateReport } from "./ReportController";
import { authenticateToken } from "@middleware/auth";

const router = Router();

router.use(authenticateToken);

router.post("/", createReport);
router.get("/my", getMyReports);
router.get("/all", getAllReports);
router.patch("/:id/status", updateReportStatus);
router.put("/:id", updateReport);
router.delete("/:id", deleteReport);
router.get("/check/:uniqueId", checkReport);

export default router;
