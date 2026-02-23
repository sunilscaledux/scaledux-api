import { Router } from "express";
import { authenticateToken } from "@middleware/auth";
import { getConversations, getConversation, getMessages, searchMessages, sendMessage, searchUsersForChat, startConversation, getChatUser, findConversationByUser, markConversationAsRead } from "./ChatController";
import { uploadFile } from "@module/general/FileController";
import { FileUpload, handleMulterError } from "@middleware/fileupload";

const router = Router();
router.use(authenticateToken);

router.get("/conversations", getConversations);
router.get("/conversations/search-users", searchUsersForChat);
router.get("/conversations/find-by-user", findConversationByUser);
router.get("/conversations/chat-user/:userId", getChatUser);
router.post("/conversations/start", startConversation);
router.get("/conversations/:id", getConversation);
router.put("/conversations/:id/read", markConversationAsRead);
router.get("/conversations/:id/messages", getMessages);
router.get("/conversations/:id/search", searchMessages);
router.post("/conversations/:id/messages", sendMessage);

// Chat file upload: max 10MB per file, max 3 files, PDF/JPG/JPEG/DOC/DOCX/ZIP
router.post(
  "/conversations/upload-files",
  FileUpload({ uploadPath: "chat", fileFilter: "chat", maxSize: 10, maxFiles: 3 }).array("files"),
  handleMulterError,
  uploadFile
);

export default router;
