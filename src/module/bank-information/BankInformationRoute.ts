import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import { BankInformationController } from "./BankInformationController";
import { authenticateToken } from "@middleware/auth";
import { createRateLimiter } from "@middleware/rateLimiter";

const router = Router();

router.use(authenticateToken);

// Every path below spends a paid penny-drop verification, so they share one allowance
const bankVerificationLimiter = createRateLimiter(24 * 60 * 60, 2, "bank-verification");

/** Updates only re-verify when the account number or IFSC is re-entered. */
const whenReverifying = (limiter: RequestHandler): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) =>
    req.body?.accountNumber || req.body?.ifsc ? limiter(req, res, next) : next();

// Bank information routes (all authenticated users)
router.get("/bank-information", BankInformationController.getBankInformation);
router.post("/bank-information/send-otp", BankInformationController.sendEmailOtp);
router.post("/bank-information", bankVerificationLimiter, BankInformationController.createBankInformation);
router.post("/bank-information/resubmit-verification", bankVerificationLimiter, BankInformationController.resubmitForVerification);
router.patch("/bank-information/:bankInformationId", whenReverifying(bankVerificationLimiter), BankInformationController.updateBankInformation);

export default router;
