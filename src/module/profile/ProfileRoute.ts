import { Router } from "express";
import { getProfileCompletion } from "./ProfileCompletionController";
import { ProfileController } from "./ProfileController";
import { CompanyProfileController } from "./CompanyProfileController";
import { TeamMemberController } from "./TeamMemberController";
import { FundingRoundController } from "./FundingRoundController";
import { RaisingFundController } from "./RaisingFundController";
import { getInvestmentProfile, updateInvestmentProfile } from "./InvestmentProfileController";
import { NotificationPreferencesController } from "./NotificationPreferencesController";
import { NotificationController as InAppNotificationController } from "../notification/NotificationController";
import * as DeactivationController from "./DeactivationController";
import { authenticateToken, optionalAuth } from "@middleware/auth";
import { FileUpload, handleMulterError } from "@middleware/fileupload";
import { uploadFile } from "@module/general/FileController";

const router = Router();

router.get("/me", authenticateToken, ProfileController.getMyProfile);

router.post('/verify-password', authenticateToken, ProfileController.verifyPassword);
router.patch('/summary', authenticateToken, ProfileController.updateSummary);
router.patch('/personal-info', authenticateToken, ProfileController.updatePersonalInfo);
router.patch('/hourly-rate', authenticateToken, ProfileController.updateHourlyRate);
router.patch('/available-hours-per-week', authenticateToken, ProfileController.updateAvailableHoursPerWeek);
router.patch('/languages', authenticateToken, ProfileController.updateLanguages);
router.post(
  '/profile-image',
  authenticateToken,
  FileUpload({ uploadPath: 'profile', fieldName: 'profile_image' }).single('image'),
  ProfileController.uploadProfileImage,
  handleMulterError
);
router.post(
  '/cover-image',
  authenticateToken,
  FileUpload({ uploadPath: 'cover', fieldName: 'cover_image' }).single('image'),
  ProfileController.uploadCoverImage,
  handleMulterError
);
router.get('/password-status', authenticateToken, ProfileController.getPasswordStatus);
router.patch('/set-password', authenticateToken, ProfileController.setPassword);
router.patch('/password', authenticateToken, ProfileController.updatePassword);
router.patch('/privacy', authenticateToken, ProfileController.updatePrivacySettings);
router.get('/name-status', authenticateToken, ProfileController.getNameStatus);
router.patch('/name', authenticateToken, ProfileController.updateName);
router.patch('/agency-settings', authenticateToken, ProfileController.updateAgencySettings);

router.get('/company/me', authenticateToken, CompanyProfileController.getMyProfile);
router.get('/company/public/:uniqueId', CompanyProfileController.getPublicProfile);
router.post(
  '/company/profile-image',
  authenticateToken,
  FileUpload({ uploadPath: 'profile/company', fieldName: 'company_profile_image' }).single('image'),
  CompanyProfileController.uploadProfileImage,
  handleMulterError
);
router.post(
  '/company/cover-image',
  authenticateToken,
  FileUpload({ uploadPath: 'cover/company', fieldName: 'company_cover_image' }).single('image'),
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
  FileUpload({ uploadPath: 'documents/target-market', fileFilter: 'document', maxSize: 5, maxFiles: 1, fieldName: 'target_market_document' }).array('document'),
  uploadFile,
  handleMulterError
);
router.patch('/company/target-market', authenticateToken, CompanyProfileController.updateTargetMarket);
router.patch('/company/revenue-model', authenticateToken, CompanyProfileController.updateRevenueModel);
router.patch(
  '/company/traction',
  authenticateToken,
  FileUpload({ uploadPath: 'documents/traction', fileFilter: 'any', maxSize: 50, maxFiles: 1, fieldName: 'traction_document' }).single('document'),
  CompanyProfileController.uploadTractionDocument,
  handleMulterError
);

router.get('/company/pitch-deck', authenticateToken, CompanyProfileController.getPitchDeck);
router.patch('/company/pitch-deck', authenticateToken, CompanyProfileController.updatePitchDeck);

router.get('/company/funding-rounds', authenticateToken, FundingRoundController.getFundingRounds);
router.post('/company/funding-rounds', authenticateToken, FundingRoundController.createFundingRound);
router.patch('/company/funding-rounds/:id', authenticateToken, FundingRoundController.updateFundingRound);
router.delete('/company/funding-rounds/:id', authenticateToken, FundingRoundController.deleteFundingRound);

router.get('/company/raising-fund', authenticateToken, RaisingFundController.getRaisingFund);
router.patch('/company/raising-fund', authenticateToken, RaisingFundController.updateRaisingFund);

router.get('/company/team-members', authenticateToken, TeamMemberController.getTeamMembers);
router.get('/company/team-members/:id', authenticateToken, TeamMemberController.getTeamMemberById);
router.post('/company/team-members', authenticateToken, TeamMemberController.createTeamMember);
router.patch('/company/team-members/:id', authenticateToken, TeamMemberController.updateTeamMember);
router.delete('/company/team-members/:id', authenticateToken, TeamMemberController.deleteTeamMember);
router.post(
  '/company/team-members/:id/profile-image',
  authenticateToken,
  FileUpload({ uploadPath: 'team/members', fileFilter: 'image', maxSize: 2, fieldName: 'team_member_profile_image' }).single('image'),
  TeamMemberController.uploadProfileImage,
  handleMulterError
);

router.get("/investment-profile", authenticateToken, getInvestmentProfile);
router.patch("/investment-profile", authenticateToken, updateInvestmentProfile);
router.post(
  '/investment-profile/upload-photo',
  authenticateToken,
  FileUpload({ uploadPath: 'committee-members', fileFilter: 'image', maxSize: 5, maxFiles: 1, fieldName: 'committee_member_photo' }).single('photo'),
  uploadFile,
  handleMulterError
);

router.get("/notification-preferences/types", authenticateToken, NotificationPreferencesController.getTypes);
router.get("/notification-preferences", authenticateToken, NotificationPreferencesController.getPreferences);
router.patch("/notification-preferences", authenticateToken, NotificationPreferencesController.updatePreferences);

router.get("/notifications/unread-count", authenticateToken, InAppNotificationController.getUnreadCount);
router.patch("/notifications/read-all", authenticateToken, InAppNotificationController.markAllAsRead);
router.get("/notifications", authenticateToken, InAppNotificationController.list);
router.patch("/notifications/:id/read", authenticateToken, InAppNotificationController.markAsRead);
router.patch("/notifications/:id/unread", authenticateToken, InAppNotificationController.markAsUnread);
router.patch("/notifications/:id/hide", authenticateToken, InAppNotificationController.hide);
router.delete("/notifications/:id", authenticateToken, InAppNotificationController.remove);

router.post("/deactivate/confirm", authenticateToken, DeactivationController.confirmDeactivate);
router.post("/delete/schedule", authenticateToken, DeactivationController.scheduleDelete);
router.get("/deactivation-status", authenticateToken, DeactivationController.getDeactivationStatus);
router.post("/delete/cancel", authenticateToken, DeactivationController.cancelDeactivation);

router.get("/completion/status", authenticateToken, getProfileCompletion);
router.get("/:uniqueId/reviews", ProfileController.getPublicProfileReviews);
router.get("/:uniqueId", optionalAuth, ProfileController.getPublicProfile);

export default router;
