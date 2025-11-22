import { Router } from "express"
import {
  sendPhoneOTP,
  verifyPhoneOTP,
  getPhoneVerificationStatus,
  updatePhoneNumber
} from "./VerifyController"
import { authenticateToken } from "@middleware/auth"

const router = Router()

// All routes require authentication
router.use(authenticateToken)

// Phone verification routes
router.post("/phone/send-otp", sendPhoneOTP)
router.post("/phone/verify-otp", verifyPhoneOTP)
router.get("/phone/status", getPhoneVerificationStatus)
router.put("/phone/update", updatePhoneNumber)

export default router
