import { Router } from "express";
import { getPublicProfile } from "./ProfileController";
import { getProfileCompletion } from "./ProfileCompletionController";
import { UnifiedProfileController } from "./UnifiedProfileController";
import { FreelancerProfileController } from "./FreelancerProfileController";
import { CompanyProfileController } from "./CompanyProfileController";
import { TeamMemberController } from "./TeamMemberController";
import { FundingRoundController } from "./FundingRoundController";
import { authenticateToken } from "@middleware/auth";
import { FileUpload, handleMulterError } from "@middleware/fileupload";
import { uploadFile } from "@module/general/FileController";

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
 * Company/Founder Profile Routes
 */
router.get('/company/me', authenticateToken, CompanyProfileController.getMyProfile);
router.post(
  '/company/profile-image',
  authenticateToken,
  FileUpload({ uploadPath: 'profile/company' }).single('image'),
  CompanyProfileController.uploadProfileImage,
  handleMulterError
);
router.post(
  '/company/cover-image',
  authenticateToken,
  FileUpload({ uploadPath: 'cover/company' }).single('image'),
  CompanyProfileController.uploadCoverImage,
  handleMulterError
);
router.patch('/company/overview', authenticateToken, CompanyProfileController.updateOverview);
router.patch('/company/details', authenticateToken, CompanyProfileController.updateDetails);
router.patch('/company/funding', authenticateToken, CompanyProfileController.updateFunding);
router.patch('/company/problem-solution', authenticateToken, CompanyProfileController.updateProblemSolution);
router.post(
  '/company/target-market-document',
  authenticateToken,
  FileUpload({ uploadPath: 'documents/target-market', fileFilter: 'document', maxSize: 5, maxFiles: 1 }).array('document'),
  uploadFile,
  handleMulterError
);
router.patch('/company/target-market', authenticateToken, CompanyProfileController.updateTargetMarket);
router.patch('/company/revenue-model', authenticateToken, CompanyProfileController.updateRevenueModel);
router.patch(
  '/company/traction',
  authenticateToken,
  FileUpload({ uploadPath: 'documents/traction', fileFilter: 'any', maxSize: 50, maxFiles: 1 }).single('document'),
  CompanyProfileController.uploadTractionDocument,
  handleMulterError
);

/**
 * Funding Round Routes
 */
router.get('/company/funding-rounds', authenticateToken, FundingRoundController.getFundingRounds);
router.post('/company/funding-rounds', authenticateToken, FundingRoundController.createFundingRound);
router.patch('/company/funding-rounds/:id', authenticateToken, FundingRoundController.updateFundingRound);
router.delete('/company/funding-rounds/:id', authenticateToken, FundingRoundController.deleteFundingRound);

/**
 * Team Member Routes
 */
router.get('/company/team-members', authenticateToken, TeamMemberController.getTeamMembers);
router.get('/company/team-members/:id', authenticateToken, TeamMemberController.getTeamMemberById);
router.post('/company/team-members', authenticateToken, TeamMemberController.createTeamMember);
router.patch('/company/team-members/:id', authenticateToken, TeamMemberController.updateTeamMember);
router.delete('/company/team-members/:id', authenticateToken, TeamMemberController.deleteTeamMember);
router.post(
  '/company/team-members/:id/profile-image',
  authenticateToken,
  FileUpload({ uploadPath: 'team/members', fileFilter: 'image', maxSize: 2 }).single('image'),
  TeamMemberController.uploadProfileImage,
  handleMulterError
);

/**
 * Public & Completion Routes
 */
router.get("/:uniqueId", getPublicProfile);
router.get("/completion/status", authenticateToken, getProfileCompletion);

export default router;
