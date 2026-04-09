import { Router } from "express";
import { authenticateToken } from "@middleware/auth";
import { requireCompleteProfile } from "@middleware/requireCompleteProfile";
import { getConversations, getConversation, getMessages, searchMessages, sendMessage, searchUsersForChat, startConversation, getChatUser, findConversationByUser, markConversationAsRead, blockConversation, unblockConversation } from "./ChatController";
import { uploadFile } from "@module/general/FileController";
import { FileUpload, handleMulterError } from "@middleware/fileupload";

const router = Router();
router.use(authenticateToken);

router.get("/conversations", getConversations);
router.get("/conversations/search-users", searchUsersForChat);
router.get("/conversations/find-by-user", findConversationByUser);
router.get("/conversations/chat-user/:userId", getChatUser);
// Messaging anyone requires a complete profile (all roles)
router.post("/conversations/start", requireCompleteProfile(), startConversation);
router.get("/conversations/:id", getConversation);
router.put("/conversations/:id/read", markConversationAsRead);
router.put("/conversations/:id/block", blockConversation);
router.put("/conversations/:id/unblock", unblockConversation);
router.get("/conversations/:id/messages", getMessages);
router.get("/conversations/:id/search", searchMessages);
router.post("/conversations/:id/messages", requireCompleteProfile(), sendMessage);

router.post(
  "/conversations/upload-files",
  FileUpload({ uploadPath: "chat", fileFilter: "chat", maxSize: 10, maxFiles: 3, fieldName: "chat_files" }).array("files"),
  handleMulterError,
  uploadFile
);

export default router;
