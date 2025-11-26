import { Router } from "express";
import {
  updateProfileSummary,
  updatePersonalInfo,
  updatePrivacySettings,
  updateHourlyRate,
  updateLanguages,
  updateAgencySettings,
  uploadProfileImage,
  uploadCoverImage,
} from "./ProfileController";
import { authenticateToken } from "@middleware/auth";
import { handleMulterError, FileUpload } from "@middleware/fileupload";

const router = Router();

router.put("/profile/summary", authenticateToken, updateProfileSummary);
router.put("/profile/personal-info", authenticateToken, updatePersonalInfo);
router.put("/profile/privacy-settings", authenticateToken, updatePrivacySettings);
router.put("/profile/hourly-rate", authenticateToken, updateHourlyRate);
router.put("/profile/languages", authenticateToken, updateLanguages);
router.put("/profile/agency-settings", authenticateToken, updateAgencySettings);

router.post(
  "/profile/upload-profile-image",
  authenticateToken,
  FileUpload({ uploadPath: `profile` }).single("profileImage"),
  uploadProfileImage
);

// Cover image upload route
router.post(
  "/profile/upload-cover-image",
  authenticateToken,
  FileUpload({ uploadPath: `cover` }).single("coverImage"),
  uploadCoverImage,
  handleMulterError
);

export default router;
