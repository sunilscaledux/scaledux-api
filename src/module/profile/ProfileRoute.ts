import { Router } from "express";
import { getProfileCompletion } from "./ProfileCompletionController";
import { ProfileController } from "./ProfileController";
import { CompanyProfileController } from "./CompanyProfileController";
import { TeamMemberController } from "./TeamMemberController";
import { FundingRoundController } from "./FundingRoundController";
import { RaisingFundController } from "./RaisingFundController";
import { authenticateToken } from "@middleware/auth";
import { FileUpload, handleMulterError } from "@middleware/fileupload";
import { uploadFile } from "@module/general/FileController";

const router = Router();

/**
 * Unified Profile Routes
 */
router.get("/me", authenticateToken, ProfileController.getMyProfile);

/**
 * Personal Info Routes (common for all users)
 */
router.patch('/summary', authenticateToken, ProfileController.updateSummary);
router.patch('/personal-info', authenticateToken, ProfileController.updatePersonalInfo);
router.patch('/hourly-rate', authenticateToken, ProfileController.updateHourlyRate);
router.patch('/available-hours-per-week', authenticateToken, ProfileController.updateAvailableHoursPerWeek);
router.patch('/languages', authenticateToken, ProfileController.updateLanguages);
router.post(
  '/profile-image',
  authenticateToken,
  FileUpload({ uploadPath: 'profile' }).single('image'),
  ProfileController.uploadProfileImage,
  handleMulterError
);
router.post(
  '/cover-image',
  authenticateToken,
  FileUpload({ uploadPath: 'cover' }).single('image'),
  ProfileController.uploadCoverImage,
  handleMulterError
);
router.patch('/privacy', authenticateToken, ProfileController.updatePrivacySettings);
router.patch('/agency-settings', authenticateToken, ProfileController.updateAgencySettings);

/**
 * Company/Founder Profile Routes
 */
router.get('/company/me', authenticateToken, CompanyProfileController.getMyProfile);
router.get('/company/public/:uniqueId', CompanyProfileController.getPublicProfile);
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
 * Raising Fund Routes
 */
router.get('/company/raising-fund', authenticateToken, RaisingFundController.getRaisingFund);
router.patch('/company/raising-fund', authenticateToken, RaisingFundController.updateRaisingFund);

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
router.get("/completion/status", authenticateToken, getProfileCompletion);
router.get("/:uniqueId", ProfileController.getPublicProfile);

export default router;
