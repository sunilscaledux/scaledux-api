import { Router } from "express";
import { BankInformationController } from "./BankInformationController";
import { authenticateToken } from "@middleware/auth";

const router = Router();

router.use(authenticateToken);

// Bank information routes (all authenticated users)
router.get("/bank-information", BankInformationController.getBankInformation);
router.post("/bank-information", BankInformationController.createBankInformation);
router.delete("/bank-information/:bankInformationId", BankInformationController.deleteBankInformation);
router.post("/bank-information/resubmit-verification", BankInformationController.resubmitForVerification);
router.patch("/bank-information/:bankInformationId", BankInformationController.updateBankInformation);

// Backward compat: old withdrawal-method routes
router.get("/withdrawal-methods", BankInformationController.getBankInformation);
router.post("/withdrawal-methods", BankInformationController.createBankInformation);
router.delete("/withdrawal-method/:bankInformationId", BankInformationController.deleteBankInformation);
router.post("/withdrawal-methods/resubmit-verification", BankInformationController.resubmitForVerification);
router.patch("/withdrawal-method/:bankInformationId", BankInformationController.updateBankInformation);

export default router;
