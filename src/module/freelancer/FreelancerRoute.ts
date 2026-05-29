import { Router } from "express";
import { FreelancerController } from "./FreelancerController";
import { optionalAuth } from "@middleware/auth";

const router = Router();

router.get("/browse", optionalAuth, FreelancerController.browseFreelancers);

export default router;
