import { Router } from "express"
import {
  sendPhoneOTP,
  verifyPhoneOTP,
} from "./VerifyPhoneController"
import {
  sendEmailOTP,
  verifyEmailOTP,
} from "./EmailVerifyController"
import {
  submitIdentityVerification,
  getIdentityVerificationDetails,
  getKeycode,
} from "./IdentityVerifyController"
import {
  submitAgencyVerification,
  getAgencyVerificationDetails,
  updateAgencyVerificationStatus
} from "./AgencyVerifyController"
import {
  initiateDigilocker,
  completeDigilocker
} from "./DigilockerController"
import { authenticateToken } from "@middleware/auth"
import { FileUpload, handleMulterError } from "@middleware/fileupload"
import { uploadFile } from "@module/general/FileController"
import { createRateLimiter } from "@middleware/rateLimiter"

const router = Router()

router.post("/phone/send-otp",createRateLimiter(15 * 60, 5), authenticateToken, sendPhoneOTP)
router.post("/phone/verify-otp",createRateLimiter(5 * 60, 10), authenticateToken, verifyPhoneOTP)

router.post("/email/send-otp",createRateLimiter(5 * 60, 15), authenticateToken, sendEmailOTP)
router.post("/email/verify-otp", createRateLimiter(5 * 60, 10),authenticateToken, verifyEmailOTP)

router.get("/identity/keycode", authenticateToken, getKeycode)
router.post("/identity/submit", authenticateToken, submitIdentityVerification)
router.get("/identity/details", authenticateToken, getIdentityVerificationDetails)

router.post(
  "/identity/upload-id-documents",
  authenticateToken,
  FileUpload({ uploadPath: "identity/documents", fileFilter: "identityDocument", maxSize: 10, maxFiles: 2, fieldName: "identity_documents" }).array("idDocuments"),
  uploadFile,
  handleMulterError
)

router.post(
  "/identity/upload-selfie",
  authenticateToken,
  FileUpload({ uploadPath: "identity/selfie", fileFilter: "image", maxSize: 10, maxFiles: 1, fieldName: "identity_selfie" }).array("selfieImages"),
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


// DigiLocker (Aadhaar via IDtoAI)
router.post("/digilocker/initiate", authenticateToken, initiateDigilocker)
router.post("/digilocker/complete", authenticateToken, completeDigilocker)

router.post("/agency/submit", authenticateToken, submitAgencyVerification)
router.get("/agency/details", authenticateToken, getAgencyVerificationDetails)


router.post(
  "/agency/upload-documents",
  authenticateToken,
  FileUpload({ uploadPath: "agency/documents", fileFilter: "document", maxSize: 10, maxFiles: 5, fieldName: "agency_documents" }).array("documents"),
  uploadFile,
  handleMulterError
)


export default router
