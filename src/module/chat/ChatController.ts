import { Request, Response } from "express";
import { ConversationService } from "./ConversationService";
import { ApiResponse } from "@utils/ApiResponse";
import { addSaveMessageJob } from "@queues/MessageQueue";
import { publishSocketEvent } from "@services/socketPubSub";

function getStringParam(param: unknown): string {
  return typeof param === "string" ? param : "";
}

export async function getConversations(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return ApiResponse.unauthorized(res, "Authentication required");
  const limit = req.query.limit ? Math.min(parseInt(String(req.query.limit), 10), 50) : 20;
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const result = await ConversationService.listConversationsForUser(userId, { limit, cursor });
  if (result.success) return ApiResponse.success(res, result.data, result.message);
  return ApiResponse.error(res, result.message, 500);
}

export async function searchUsersForChat(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return ApiResponse.unauthorized(res, "Authentication required");
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const result = await ConversationService.searchUsersForChat(userId, q);
  if (result.success) return ApiResponse.success(res, result.data, result.message);
  return ApiResponse.error(res, result.message, 500);
}

export async function getChatUser(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return ApiResponse.unauthorized(res, "Authentication required");
  const otherUserId = req.params.userId != null ? parseInt(String(req.params.userId), 10) : NaN;
  if (!Number.isInteger(otherUserId)) return ApiResponse.error(res, "User ID required", 400);
  const result = await ConversationService.getChatUserById(userId, otherUserId);
  if (result.success) return ApiResponse.success(res, result.data, result.message);
  return ApiResponse.error(res, result.message || "User not found", 404);
}

export async function startConversation(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return ApiResponse.unauthorized(res, "Authentication required");
  const otherUserId = req.body?.otherUserId != null ? parseInt(String(req.body.otherUserId), 10) : NaN;
  if (!Number.isInteger(otherUserId) || otherUserId === userId) {
    return ApiResponse.error(res, "Valid other user ID is required", 400);
  }
  const result = await ConversationService.getOrCreateConversation(userId, otherUserId);
  if (!result.success || !result.data) return ApiResponse.error(res, result.message || "Failed to start conversation", 500);
  const conv = await ConversationService.getConversationByUniqueId(result.data.unique_id, userId);
  if (conv.success && conv.data) return ApiResponse.success(res, conv.data, result.message, 201);
  return ApiResponse.success(res, { unique_id: result.data.unique_id, id: result.data.id }, result.message, 201);
}

export async function findConversationByUser(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return ApiResponse.unauthorized(res, "Authentication required");
  const otherUserUniqueId = typeof req.query.otherUserUniqueId === "string" ? req.query.otherUserUniqueId.trim() : "";
  if (!otherUserUniqueId) return ApiResponse.error(res, "otherUserUniqueId is required", 400);
  const result = await ConversationService.findConversationByOtherUserUniqueId(userId, otherUserUniqueId);
  if (result.success) return ApiResponse.success(res, result.data, result.message);
  if (result.message === "User not found") return ApiResponse.error(res, result.message, 404);
  return ApiResponse.error(res, result.message || "Failed to find conversation", 500);
}

export async function getConversation(req: Request, res: Response) {
  const userId = req.user?.id;
  const conversationId = getStringParam(req.params.id);
  if (!userId) return ApiResponse.unauthorized(res, "Authentication required");
  if (!conversationId) return ApiResponse.error(res, "Conversation ID required", 400);
  const result = await ConversationService.getConversationByUniqueId(conversationId, userId);
  if (result.success) return ApiResponse.success(res, result.data, result.message);
  if (result.message === "Conversation not found") return ApiResponse.error(res, result.message, 404);
  if (result.message === "Forbidden") return ApiResponse.forbidden(res, result.message);
  return ApiResponse.error(res, result.message, 500);
}

export async function getMessages(req: Request, res: Response) {
  const userId = req.user?.id;
  const conversationId = getStringParam(req.params.id);
  const rawLimit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
  const limit = Number.isNaN(rawLimit) ? 20 : Math.max(1, Math.min(rawLimit, 100));
  const before = getStringParam(req.query.before);
  if (!userId) return ApiResponse.unauthorized(res, "Authentication required");
  if (!conversationId) return ApiResponse.error(res, "Conversation ID required", 400);
  const result = await ConversationService.getMessages(conversationId, userId, { limit, before: before || undefined });
  if (result.success) {
    await ConversationService.markConversationAsRead(conversationId, userId);
    return ApiResponse.success(res, result.data, result.message);
  }
  if (result.message === "Conversation not found") return ApiResponse.error(res, result.message, 404);
  return ApiResponse.error(res, result.message, 500);
}

export async function markConversationAsRead(req: Request, res: Response) {
  const userId = req.user?.id;
  const conversationId = getStringParam(req.params.id);
  if (!userId) return ApiResponse.unauthorized(res, "Authentication required");
  if (!conversationId) return ApiResponse.error(res, "Conversation ID required", 400);
  const result = await ConversationService.markConversationAsRead(conversationId, userId);
  if (result.success) return ApiResponse.success(res, undefined, result.message);
  if (result.message === "Conversation not found") return ApiResponse.error(res, result.message, 404);
  if (result.message === "Forbidden") return ApiResponse.forbidden(res, result.message);
  return ApiResponse.error(res, result.message, 500);
}

export async function blockConversation(req: Request, res: Response) {
  const userId = req.user?.id;
  const conversationId = getStringParam(req.params.id);
  if (!userId) return ApiResponse.unauthorized(res, "Authentication required");
  if (!conversationId) return ApiResponse.error(res, "Conversation ID required", 400);
  const result = await ConversationService.blockConversation(conversationId, userId);
  if (result.success) return ApiResponse.success(res, undefined, result.message);
  if (result.message === "Conversation not found") return ApiResponse.error(res, result.message, 404);
  if (result.message === "Forbidden") return ApiResponse.forbidden(res, result.message);
  return ApiResponse.error(res, result.message, 500);
}

export async function unblockConversation(req: Request, res: Response) {
  const userId = req.user?.id;
  const conversationId = getStringParam(req.params.id);
  if (!userId) return ApiResponse.unauthorized(res, "Authentication required");
  if (!conversationId) return ApiResponse.error(res, "Conversation ID required", 400);
  const result = await ConversationService.unblockConversation(conversationId, userId);
  if (result.success) return ApiResponse.success(res, undefined, result.message);
  if (result.message === "Conversation not found") return ApiResponse.error(res, result.message, 404);
  if (result.message === "Forbidden") return ApiResponse.forbidden(res, result.message);
  if (result.message?.includes("Only the person who blocked")) return ApiResponse.error(res, result.message, 403);
  return ApiResponse.error(res, result.message, 500);
}

export async function searchMessages(req: Request, res: Response) {
  const userId = req.user?.id;
  const conversationId = getStringParam(req.params.id);
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!userId) return ApiResponse.unauthorized(res, "Authentication required");
  if (!conversationId) return ApiResponse.error(res, "Conversation ID required", 400);
  const result = await ConversationService.searchMessages(conversationId, userId, q);
  if (result.success) return ApiResponse.success(res, result.data, result.message);
  if (result.message === "Conversation not found") return ApiResponse.error(res, result.message, 404);
  if (result.message === "Forbidden") return ApiResponse.forbidden(res, result.message);
  return ApiResponse.error(res, result.message, 500);
}

export async function sendMessage(req: Request, res: Response) {
  const userId = req.user?.id;
  const conversationId = getStringParam(req.params.id);
  const { content, attachmentUrls, replyTo } = req.body || {};
  if (!userId) return ApiResponse.unauthorized(res, "Authentication required");
  if (!conversationId) return ApiResponse.error(res, "Conversation ID required", 400);
  const hasContent = typeof content === "string" && content.trim().length > 0;
  const hasAttachments = Array.isArray(attachmentUrls) && attachmentUrls.length > 0;
  if (!hasContent && !hasAttachments) return ApiResponse.error(res, "Content or attachments are required", 400);
  const replyPayload =
    replyTo &&
    typeof replyTo.messageId === "number" &&
    typeof replyTo.unique_id === "string" &&
    typeof replyTo.content === "string"
      ? {
          messageId: replyTo.messageId,
          unique_id: replyTo.unique_id,
          content: String(replyTo.content).slice(0, 500),
          senderName: typeof replyTo.senderName === "string" ? replyTo.senderName.slice(0, 200) : undefined
        }
      : undefined;

  const conv = await ConversationService.getConversationByUniqueId(conversationId, userId);
  if (!conv.success || !conv.data) {
    if (conv.message === "Conversation not found") return ApiResponse.error(res, conv.message, null, 404);
    if (conv.message === "Forbidden") return ApiResponse.forbidden(res, conv.message);
    return ApiResponse.error(res, conv.message || "Failed to get conversation", 500);
  }
  const receiverId = (conv.data as any).otherParticipant?.id as number | undefined;

  const job = await addSaveMessageJob({
    conversationId,
    userId,
    content: typeof content === "string" ? content : "",
    attachmentUrls: hasAttachments ? attachmentUrls : undefined,
    replyTo: replyPayload
  });

  const contentForPayload = typeof content === "string" ? content.trim() || "(attachment)" : "(attachment)";
  const metadata: Record<string, unknown> = {};
  if (replyPayload) metadata.replyTo = replyPayload;
  if (hasAttachments && attachmentUrls?.length) metadata.attachments = attachmentUrls;

  await publishSocketEvent({
    type: "new_message",
    conversationId,
    message: {
      id: 0,
      unique_id: `pending-${job.id}`,
      conversationId,
      senderId: userId,
      type: "USER",
      content: contentForPayload,
      metadata: Object.keys(metadata).length ? metadata : undefined,
      createdAt: new Date()
    },
    receiverId
  });

  return ApiResponse.success(
    res,
    { queued: true, jobId: job.id },
    "Message queued; you will receive it via realtime when saved.",
    202
  );
}
