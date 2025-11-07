import { Router } from "express";
import {
  createEducation,
  getEducations,
  updateEducation,
  deleteEducation,
} from "./EducationController";
import { authenticateToken } from "@middleware/auth";

const router = Router();

router.post("/education", authenticateToken, createEducation);
router.get("/education", authenticateToken, getEducations);
router.put("/education/:id", authenticateToken, updateEducation);
router.delete("/education/:id", authenticateToken, deleteEducation);

export default router;
