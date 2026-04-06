import { Router } from "express";
import {
  getUserMentorPackages,
  getMentorPackageById,
  getPublicMentorPackage,
  getPublicUserMentorPackages,
  createMentorPackage,
  updateMentorPackage,
  deleteMentorPackage,
  duplicateMentorPackage,
} from "./MentorPackageController";
import { authenticateToken } from "@middleware/auth";

const router = Router();

// Public routes - no auth required
router.get("/public/user/:uniqueId", getPublicUserMentorPackages);
router.get("/public/:id", getPublicMentorPackage);

// Auth-required routes
router.use(authenticateToken);
router.get("/", getUserMentorPackages);
router.post("/", createMentorPackage);
router.get("/:id", getMentorPackageById);
router.post("/:id/duplicate", duplicateMentorPackage);
router.put("/:id", updateMentorPackage);
router.delete("/:id", deleteMentorPackage);

export default router;
