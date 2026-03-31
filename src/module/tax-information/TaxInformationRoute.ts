import { Router } from "express";
import { TaxInformationController } from "./TaxInformationController";
import { authenticateToken } from "@middleware/auth";
import { createRateLimiter } from "@middleware/rateLimiter";

const router = Router();

router.use(authenticateToken);

router.post(
  "/tax-information",
  createRateLimiter(24 * 60 * 60, 50),
  TaxInformationController.saveTaxInformation
);

router.get(
  "/tax-information",
  TaxInformationController.getTaxInformation
);

export default router;
