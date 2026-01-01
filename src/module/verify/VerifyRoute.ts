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
  getIdentityVerificationDetails
} from "./IdentityVerifyController"
import {
  submitAgencyVerification,
  getAgencyVerificationDetails,
  updateAgencyVerificationStatus
} from "./AgencyVerifyController"
import { authenticateToken } from "@middleware/auth"
import { FileUpload, handleMulterError } from "@middleware/fileupload"
import { uploadFile } from "@module/general/FileController"

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
  FileUpload({ uploadPath: "identity/documents", fileFilter: "image", maxSize: 10, maxFiles: 2 }).array("idDocuments"),
  uploadFile,
  handleMulterError
)

router.post(
  "/identity/upload-selfie",
  authenticateToken,
  FileUpload({ uploadPath: "identity/selfie", fileFilter: "image", maxSize: 10, maxFiles: 2 }).array("selfieImages"),
  uploadFile,
  handleMulterError
)

router.post(
  "/identity/upload-address-proof",
  authenticateToken,
  FileUpload({ uploadPath: "identity/address-proof", fileFilter: "image", maxSize: 10, maxFiles: 2 }).array("addressProof"),
  uploadFile,
  handleMulterError
)

// Identity verification file delete routes - now handled by unified delete controller at /api/v1/files/delete-file

router.post("/agency/submit", authenticateToken, submitAgencyVerification)
router.get("/agency/details", authenticateToken, getAgencyVerificationDetails)

// Agency verification file upload routes
router.post(
  "/agency/upload-documents",
  authenticateToken,
  FileUpload({ uploadPath: "agency/documents", fileFilter: "document", maxSize: 10, maxFiles: 5 }).array("documents"),
  uploadFile,
  handleMulterError
)

// Agency verification file delete routes - now handled by unified delete controller at /api/v1/files/delete-file

// Admin route to approve/reject agency verification
router.put("/agency/update-status", authenticateToken, updateAgencyVerificationStatus)

export default router
