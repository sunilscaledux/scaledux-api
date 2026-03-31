import { Router } from "express";
import { TaxInformationController } from "./TaxInformationController";
import { authenticateToken } from "@middleware/auth";

const router = Router();

router.use(authenticateToken);

router.post(
  "/tax-information",
  TaxInformationController.saveTaxInformation
);

router.get(
  "/tax-information",
  TaxInformationController.getTaxInformation
);

export default router;
