import { Request, Response } from "express";
import { ConversationService } from "./ConversationService";
import { ApiResponse } from "@utils/ApiResponse";
import { emitNewMessage } from "./chatSocket";

function getStringParam(param: unknown): string {
  return typeof param === "string" ? param : "";
}

export async function getConversations(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return ApiResponse.unauthorized(res, "Authentication required");
  const result = await ConversationService.listConversationsForUser(userId);
  if (result.success) return ApiResponse.success(res, result.data, result.message);
  return ApiResponse.error(res, result.message, 500);
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
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
  const before = getStringParam(req.query.before);
  if (!userId) return ApiResponse.unauthorized(res, "Authentication required");
  if (!conversationId) return ApiResponse.error(res, "Conversation ID required", 400);
  const result = await ConversationService.getMessages(conversationId, userId, { limit, before: before || undefined });
  if (result.success) return ApiResponse.success(res, result.data, result.message);
  if (result.message === "Conversation not found") return ApiResponse.error(res, result.message, 404);
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
  const result = await ConversationService.sendMessage(
    conversationId,
    userId,
    typeof content === "string" ? content : "",
    hasAttachments ? attachmentUrls : undefined,
    replyPayload
  );
  if (result.success) {
    const data = result.data as any;
    if (data.receiverId != null) {
      emitNewMessage(conversationId, {
        id: data.id,
        unique_id: data.unique_id,
        conversationId: data.conversation_id,
        senderId: data.sender_id,
        type: data.type,
        content: data.content,
        metadata: data.metadata,
        createdAt: data.created_at
      }, data.receiverId);
    }
    const { receiverId: _, ...rest } = data;
    return ApiResponse.success(res, rest, result.message, 201);
  }
  if (result.message === "Conversation not found") return ApiResponse.error(res, result.message, 404);
  if (result.message === "Forbidden") return ApiResponse.forbidden(res, result.message);
  return ApiResponse.error(res, result.message, 500);
}
