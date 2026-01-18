import { Router } from "express";
import { getPublicProfile } from "./ProfileController";
import { getProfileCompletion } from "./ProfileCompletionController";
import { UnifiedProfileController } from "./UnifiedProfileController";
import { FreelancerProfileController } from "./FreelancerProfileController";
import { FounderProfileController } from "./FounderProfileController";
import { MentorProfileController } from "./MentorProfileController";
import { InvestorProfileController } from "./InvestorProfileController";
import { authenticateToken } from "@middleware/auth";
import { FileUpload, handleMulterError } from "@middleware/fileupload";

const router = Router();

/**
 * Unified Profile Routes
 */
router.get("/me", authenticateToken, UnifiedProfileController.getMyProfile);
router.get("/me/all", authenticateToken, UnifiedProfileController.getAllMyProfiles);
router.get("/me/full", authenticateToken, UnifiedProfileController.getMyFullProfile);

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


/**
 * Founder Profile Routes
 */
router.get('/founder/me', authenticateToken, FounderProfileController.getMyProfile);
router.patch('/founder/company', authenticateToken, FounderProfileController.updateCompanyDetails);
router.patch('/founder/funding', authenticateToken, FounderProfileController.updateFundingInfo);
router.post(
  '/founder/logo',
  authenticateToken,
  FileUpload({ uploadPath: 'company/logos' }).single('logo'),
  FounderProfileController.uploadCompanyLogo,
  handleMulterError
);
router.post(
  '/founder/cover',
  authenticateToken,
  FileUpload({ uploadPath: 'company/covers' }).single('cover'),
  FounderProfileController.uploadCompanyCover,
  handleMulterError
);
router.patch('/founder/social-links', authenticateToken, FounderProfileController.updateSocialLinks);

/**
 * Mentor Profile Routes
 */
router.get('/mentor/me', authenticateToken, MentorProfileController.getMyProfile);
router.patch('/mentor/expertise', authenticateToken, MentorProfileController.updateExpertise);
router.patch('/mentor/session-rate', authenticateToken, MentorProfileController.updateSessionRate);
router.patch('/mentor/availability', authenticateToken, MentorProfileController.updateAvailability);

/**
 * Investor Profile Routes
 */
router.get('/investor/me', authenticateToken, InvestorProfileController.getMyProfile);
router.patch('/investor/preferences', authenticateToken, InvestorProfileController.updatePreferences);
router.patch('/investor/ticket-size', authenticateToken, InvestorProfileController.updateTicketSize);
router.patch('/investor/portfolio', authenticateToken, InvestorProfileController.updatePortfolio);

/**
 * Public & Completion Routes
 */
router.get("/:uniqueId", getPublicProfile);
router.get("/completion/status", authenticateToken, getProfileCompletion);

export default router;
