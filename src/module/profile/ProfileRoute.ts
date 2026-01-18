import { Router } from "express";
import { getPublicProfile } from "./ProfileController";
import { getProfileCompletion } from "./ProfileCompletionController";
import { UnifiedProfileController } from "./UnifiedProfileController";
import { FreelancerProfileController } from "./FreelancerProfileController";
import { authenticateToken } from "@middleware/auth";
import { FileUpload, handleMulterError } from "@middleware/fileupload";

const router = Router();

/**
 * Unified Profile Routes
 */
router.get("/me", authenticateToken, UnifiedProfileController.getMyProfile);

/**
 * Freelancer Profile Routes
 */
router.get('/freelancer/me', authenticateToken, FreelancerProfileController.getMyProfile);
router.patch('/freelancer/summary', authenticateToken, FreelancerProfileController.updateSummary);
router.patch('/freelancer/personal-info', authenticateToken, FreelancerProfileController.updatePersonalInfo);
router.patch('/freelancer/hourly-rate', authenticateToken, FreelancerProfileController.updateHourlyRate);
router.patch('/freelancer/languages', authenticateToken, FreelancerProfileController.updateLanguages);
router.post(
  '/freelancer/profile-image',
  authenticateToken,
  FileUpload({ uploadPath: 'profile/freelancer' }).single('image'),
  FreelancerProfileController.uploadProfileImage,
  handleMulterError
);
router.post(
  '/freelancer/cover-image',
  authenticateToken,
  FileUpload({ uploadPath: 'cover/freelancer' }).single('image'),
  FreelancerProfileController.uploadCoverImage,
  handleMulterError
);
router.patch('/freelancer/privacy', authenticateToken, FreelancerProfileController.updatePrivacySettings);
router.patch('/freelancer/agency-settings', authenticateToken, FreelancerProfileController.updateAgencySettings);

/**
 * Public & Completion Routes
 */
router.get("/:uniqueId", getPublicProfile);
router.get("/completion/status", authenticateToken, getProfileCompletion);

export default router;
