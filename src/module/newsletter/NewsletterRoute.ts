import { Router } from "express";
import { NewsletterController } from "./NewsletterController";
import { createRateLimiter } from "@middleware/rateLimiter";

const router = Router();

// Public endpoint (landing join-community form). Cap submissions to curb spam/abuse.
const newsletterLimiter = createRateLimiter(60 * 60, 10); // 10 per hour per IP

router.post("/", newsletterLimiter, NewsletterController.subscribe);

export default router;
