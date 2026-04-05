import { Router } from "express";
import { createReport, checkReport } from "./ReportController";
import { authenticateToken } from "@middleware/auth";

const router = Router();

router.use(authenticateToken);

router.post("/", createReport);
router.get("/check/:uniqueId", checkReport);

export default router;
