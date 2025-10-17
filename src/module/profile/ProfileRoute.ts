import { Router } from "express";
import {
  updateProfileSummary,
  uploadProfileImage,
  uploadCoverImage,
} from "./ProfileController";
import { authenticateToken } from "@middleware/auth";
import { handleMulterError, FileUpload } from "@middleware/fileupload";

const router = Router();

router.put("/profile/summary", authenticateToken, updateProfileSummary);

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
