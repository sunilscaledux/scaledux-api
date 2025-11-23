import { Router } from "express"
import { 
  sendPhoneOTP,
  verifyPhoneOTP,
  getPhoneVerificationStatus,
  updatePhoneNumber
} from "./VerifyPhoneController"
import {
  getEmailVerificationStatus,
  sendEmailOTP,
  verifyEmailOTP,
  updateEmailAddress
} from "./EmailVerifyController"
import {
  getIdentityVerificationStatus,
  submitIdentityVerification,
  getIdentityVerificationDetails,
  uploadIdDocuments,
  uploadSelfieImages,
  deleteIdDocument,
  deleteSelfieImage
} from "./IdentityVerifyController"
import { authenticateToken } from "@middleware/auth"
import { FileUpload, handleMulterError } from "@middleware/fileupload"

const router = Router()

// All routes require authentication
// router.use(authenticateToken)

// Phone verification routes
router.get("/phone/status", authenticateToken, getPhoneVerificationStatus)
router.post("/phone/send-otp", authenticateToken, sendPhoneOTP)
router.post("/phone/verify-otp", authenticateToken, verifyPhoneOTP)
router.put("/phone/update", authenticateToken, updatePhoneNumber)

// Email verification routes
router.get("/email/status", authenticateToken, getEmailVerificationStatus)
router.post("/email/send-otp", authenticateToken, sendEmailOTP)
router.post("/email/verify-otp", authenticateToken, verifyEmailOTP)
router.put("/email/update", authenticateToken, updateEmailAddress)

// Identity verification routes
router.get("/identity/status", authenticateToken, getIdentityVerificationStatus)
router.post("/identity/submit", authenticateToken, submitIdentityVerification)
router.get("/identity/details", authenticateToken, getIdentityVerificationDetails)

// Identity verification file upload routes
router.post(
  "/identity/upload-id-documents",
  authenticateToken,
  FileUpload({ uploadPath: "identity/documents", fileFilter: "image", maxSize: 10, maxFiles: 5 }).array("idDocuments"),
  uploadIdDocuments,
  handleMulterError
)

router.post(
  "/identity/upload-selfie",
  authenticateToken,
  FileUpload({ uploadPath: "identity/selfie", fileFilter: "image", maxSize: 10, maxFiles: 3 }).array("selfieImages"),
  uploadSelfieImages,
  handleMulterError
)

// Identity verification file delete routes
router.delete("/identity/delete-id-document", authenticateToken, deleteIdDocument)
router.delete("/identity/delete-selfie", authenticateToken, deleteSelfieImage)

export default router
