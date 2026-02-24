import { Router } from "express";
import { createReview, listReviews, listMyReviews, updateReview, deleteReview } from "./ReviewController";
import { authenticateToken } from "@middleware/auth";

const router = Router();
router.use(authenticateToken);

router.post("/", createReview);
router.get("/", listReviews);
router.get("/me", listMyReviews);
router.patch("/:uniqueId", updateReview);
router.delete("/:uniqueId", deleteReview);

export default router;
