import { Router } from "express";
import { TaxInformationController } from "./TaxInformationController";
import { authenticateToken } from "@middleware/auth";
import { createRateLimiter } from "@middleware/rateLimiter";
import { requirePasswordConfirmation } from "@middleware/requirePasswordConfirmation";

const router = Router();

router.use(authenticateToken);

router.post(
  "/tax-information",
  createRateLimiter(24 * 60 * 60, 2),
  requirePasswordConfirmation,
  TaxInformationController.saveTaxInformation
);

router.get(
  "/tax-information",
  TaxInformationController.getTaxInformation
);

export default router;
