import { Router } from "express";
import { BankInformationController } from "./BankInformationController";
import { authenticateToken } from "@middleware/auth";
import { requirePasswordConfirmation } from "@middleware/requirePasswordConfirmation";

const router = Router();

router.use(authenticateToken);

// Bank information routes (all authenticated users)
router.get("/bank-information", BankInformationController.getBankInformation);
router.post("/bank-information", requirePasswordConfirmation, BankInformationController.createBankInformation);
router.post("/bank-information/resubmit-verification", BankInformationController.resubmitForVerification);
router.patch("/bank-information/:bankInformationId", requirePasswordConfirmation, BankInformationController.updateBankInformation);

export default router;
