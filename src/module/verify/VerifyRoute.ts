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
  updateIdentityVerificationStatus
} from "./IdentityVerifyController"
import {
  submitAgencyVerification,
  getAgencyVerificationDetails,
  getAgencyVerificationStatus,
  updateAgencyVerificationStatus
} from "./AgencyVerifyController"
import { authenticateToken } from "@middleware/auth"
import { FileUpload, handleMulterError } from "@middleware/fileupload"
import { uploadFile } from "@module/general/FileController"

const router = Router()

router.get("/phone/status", authenticateToken, getPhoneVerificationStatus)
router.post("/phone/send-otp", authenticateToken, sendPhoneOTP)
router.post("/phone/verify-otp", authenticateToken, verifyPhoneOTP)
router.put("/phone/update", authenticateToken, updatePhoneNumber)

router.get("/email/status", authenticateToken, getEmailVerificationStatus)
router.post("/email/send-otp", authenticateToken, sendEmailOTP)
router.post("/email/verify-otp", authenticateToken, verifyEmailOTP)
router.put("/email/update", authenticateToken, updateEmailAddress)

router.get("/identity/status", authenticateToken, getIdentityVerificationStatus)
router.post("/identity/submit", authenticateToken, submitIdentityVerification)
router.get("/identity/details", authenticateToken, getIdentityVerificationDetails)
router.post("/identity/review", authenticateToken, updateIdentityVerificationStatus)

router.post(
  "/identity/upload-id-documents",
  authenticateToken,
  FileUpload({ uploadPath: "identity/documents", fileFilter: "image", maxSize: 10, maxFiles: 2, fieldName: "identity_documents" }).array("idDocuments"),
  uploadFile,
  handleMulterError
)

router.post(
  "/identity/upload-selfie",
  authenticateToken,
  FileUpload({ uploadPath: "identity/selfie", fileFilter: "image", maxSize: 10, maxFiles: 2, fieldName: "identity_selfie" }).array("selfieImages"),
  uploadFile,
  handleMulterError
)

router.post(
  "/identity/upload-address-proof",
  authenticateToken,
  FileUpload({ uploadPath: "identity/address-proof", fileFilter: "image", maxSize: 10, maxFiles: 2, fieldName: "identity_address_proof" }).array("addressProof"),
  uploadFile,
  handleMulterError
)


router.get("/agency/status", authenticateToken, getAgencyVerificationStatus)
router.post("/agency/submit", authenticateToken, submitAgencyVerification)
router.get("/agency/details", authenticateToken, getAgencyVerificationDetails)
router.post("/agency/review", authenticateToken, updateAgencyVerificationStatus)

router.post(
  "/agency/upload-documents",
  authenticateToken,
  FileUpload({ uploadPath: "agency/documents", fileFilter: "document", maxSize: 10, maxFiles: 5, fieldName: "agency_documents" }).array("documents"),
  uploadFile,
  handleMulterError
)


export default router
