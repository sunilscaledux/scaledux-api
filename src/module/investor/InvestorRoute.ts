import { Router } from "express";
import { InvestorController } from "./InvestorController";
import { optionalAuth } from "@middleware/auth";

const router = Router();

// Public routes
router.get("/browse", optionalAuth, InvestorController.browseInvestors);
router.get("/startups", optionalAuth, InvestorController.browseStartups);
router.get("/:uniqueId", InvestorController.getPublicProfile);

export default router;
