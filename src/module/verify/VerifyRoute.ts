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
import { authenticateToken } from "@middleware/auth"

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

export default router
