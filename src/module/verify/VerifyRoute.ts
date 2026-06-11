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
  getIdentityVerificationDetails,
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

// 2 verification attempts per 24 hours
const verifyLimit = createRateLimiter(24 * 60 * 60, 10)

// OTP send: 5 requests per 10 minutes (per IP). Tightened from the previous
// 15/15min so users can't spam the channel — they get the initial code, plus
// up to 4 resends (2-min countdown × 4 ≈ 8 min) within the OTP validity.
router.post("/phone/send-otp", createRateLimiter(10 * 60, 5), authenticateToken, sendPhoneOTP)
router.post("/phone/verify-otp", createRateLimiter(15 * 60, 15), authenticateToken, verifyPhoneOTP)

router.post("/email/send-otp", createRateLimiter(10 * 60, 5), authenticateToken, sendEmailOTP)
router.post("/email/verify-otp", createRateLimiter(15 * 60, 15), authenticateToken, verifyEmailOTP)

router.get("/identity/details", authenticateToken, getIdentityVerificationDetails)

// DigiLocker (Aadhaar via IDtoAI)
router.post("/digilocker/initiate", authenticateToken, verifyLimit, initiateDigilocker)
router.post("/digilocker/complete", authenticateToken, completeDigilocker)

router.post("/agency/submit", authenticateToken, verifyLimit, submitAgencyVerification)
router.get("/agency/details", authenticateToken, getAgencyVerificationDetails)


router.post(
  "/agency/upload-documents",
  authenticateToken,
  FileUpload({ uploadPath: "agency/documents", fileFilter: "document", maxSize: 10, maxFiles: 5, fieldName: "agency_documents" }).array("documents"),
  uploadFile,
  handleMulterError
)


export default router
