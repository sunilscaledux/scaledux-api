import { Router } from "express";
import { MentorController } from "./MentorController";
import { optionalAuth, authenticateToken } from "@middleware/auth";

const router = Router();

// Public routes
router.get("/browse", optionalAuth, MentorController.browseMentors);
router.get("/featured", optionalAuth, MentorController.getFeaturedMentors);
router.get("/on-request/public/:uniqueId", MentorController.getPublicOnRequestSettings);

// Auth-required routes
router.post("/save", authenticateToken, MentorController.toggleSaveMentor);
router.get("/saved", authenticateToken, MentorController.getSavedMentors);
router.get("/saved/check/:uniqueId", authenticateToken, MentorController.checkSaved);

// Mentorship on-request settings
router.get("/on-request", authenticateToken, MentorController.getOnRequestSettings);
router.post("/on-request", authenticateToken, MentorController.saveOnRequestSettings);

export default router;
