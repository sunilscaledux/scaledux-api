import { Router } from "express";
import { ContactController } from "./ContactController";
import { createRateLimiter } from "@middleware/rateLimiter";

const router = Router();

// Public endpoint (landing contact form). Cap submissions to curb spam/abuse.
const contactLimiter = createRateLimiter(60 * 60, 5); // 5 per hour per IP

router.post("/", contactLimiter, ContactController.create);

export default router;
