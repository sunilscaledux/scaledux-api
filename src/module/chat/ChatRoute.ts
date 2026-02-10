import { Router } from "express";
import { authenticateToken } from "@middleware/auth";
import { getConversations, getConversation, getMessages, sendMessage } from "./ChatController";

const router = Router();
router.use(authenticateToken);

router.get("/conversations", getConversations);
router.get("/conversations/:id", getConversation);
router.get("/conversations/:id/messages", getMessages);
router.post("/conversations/:id/messages", sendMessage);

export default router;
