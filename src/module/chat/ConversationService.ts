import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";
import { getFileUrl, extractRelativePath } from "@utils/General";
import { emitNewMessageToBothUsers } from "./chatSocket";

function toProfileImageUrl(profileImage: string | null | undefined): string | null {
  if (!profileImage) return null;
  const url = getFileUrl(profileImage);
  return url || null;
}

/** Map message metadata.attachments (relative paths) to full URLs for API response. */
function metadataWithAttachmentUrls(metadata: any): any {
  if (!metadata || typeof metadata !== "object") return metadata;
  const attachments = metadata.attachments;
  if (!Array.isArray(attachments) || attachments.length === 0) return metadata;
  return {
    ...metadata,
    attachments: attachments.map((p: string) => getFileUrl(p))
  };
}

function formatLocation(city: string | null | undefined, countryName: string | null | undefined): string | null {
  const parts = [city, countryName].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * ConversationService
 * Handles conversation and system message creation for chat sync (invites, proposals, etc.)
 */
export class ConversationService {
  /**
   * Get or create a conversation between two users, optionally scoped to a project.
   * Uses normalized user ids (user1_id <= user2_id) for consistent lookup.
   */
  static async getOrCreateConversation(
    userId1: number,
    userId2: number,
    projectId?: number
  ): Promise<ServiceResponse<{ id: number; unique_id: string }>> {
    try {
      const [u1, u2] = userId1 <= userId2 ? [userId1, userId2] : [userId2, userId1];

      const existing = await (prisma as any).conversation.findFirst({
        where: {
          user1_id: u1,
          user2_id: u2,
          project_id: projectId ?? null
        }
      });

      if (existing) {
        return { success: true, message: "Conversation found", data: { id: existing.id, unique_id: existing.unique_id } };
      }

      const created = await (prisma as any).conversation.create({
        data: {
          user1_id: u1,
          user2_id: u2,
          project_id: projectId ?? null
        }
      });

      return { success: true, message: "Conversation created", data: { id: created.id, unique_id: created.unique_id } };
    } catch (error: any) {
      console.error("getOrCreateConversation Error:", error);
      return { success: false, message: error.message || "Failed to get or create conversation" };
    }
  }

  /**
   * Create a system message in a conversation.
   * Optional senderId = initiator (founder or provider) so the message displays as sent by that user.
   */
  static async createSystemMessage(
    conversationId: number,
    content: string,
    metadata?: Record<string, unknown>,
    senderId?: number
  ): Promise<ServiceResponse<{ id: number; unique_id: string; type: string; content: string; metadata: any; created_at: Date; sender_id: number | null }>> {
    try {
      const msg = await (prisma as any).message.create({
        data: {
          conversation_id: conversationId,
          sender_id: senderId ?? null,
          type: "SYSTEM",
          content,
          metadata: metadata ?? undefined
        }
      });
      return { success: true, message: "System message created", data: msg };
    } catch (error: any) {
      console.error("createSystemMessage Error:", error);
      return { success: false, message: error.message || "Failed to create system message" };
    }
  }

  /**
   * Get-or-create conversation and post a system message in one go (for invite/proposal sync).
   * initiatorUserId = user who triggered the event (founder or provider); message displays as sent by them.
   */
  static async syncSystemMessage(
    userId1: number,
    userId2: number,
    content: string,
    metadata?: Record<string, unknown>,
    projectId?: number,
    initiatorUserId?: number
  ): Promise<ServiceResponse<{ conversationUniqueId: string }>> {
    const conv = await this.getOrCreateConversation(userId1, userId2, projectId);
    if (!conv.success || !conv.data) return { success: false, message: conv.message };

    const msg = await this.createSystemMessage(conv.data.id, content, metadata, initiatorUserId);
    if (!msg.success) return { success: false, message: msg.message };

    // Realtime: emit to conversation room and both user rooms
    const payload = {
      id: msg.data!.id,
      unique_id: msg.data!.unique_id,
      conversationId: conv.data.unique_id,
      senderId: msg.data!.sender_id ?? null,
      type: msg.data!.type,
      content: msg.data!.content,
      metadata: msg.data!.metadata ?? undefined,
      createdAt: msg.data!.created_at
    };
    emitNewMessageToBothUsers(conv.data.unique_id, payload, userId1, userId2);

    return { success: true, message: "Synced", data: { conversationUniqueId: conv.data.unique_id } };
  }

  /**
   * List conversations for a user (with last message and other participant). Paginated with cursor.
   */
  static async listConversationsForUser(
    userId: number,
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<ServiceResponse<{ list: any[]; nextCursor: string | null; hasMore: boolean }>> {
    try {
      const limit = Math.min(opts.limit ?? 20, 50);
      const cursorDate = opts.cursor ? new Date(opts.cursor) : null;

      const convos = await (prisma as any).conversation.findMany({
        where: {
          OR: [{ user1_id: userId }, { user2_id: userId }],
          ...(cursorDate ? { updated_at: { lt: cursorDate } } : {})
        },
        include: {
          user1: { select: { id: true, unique_id: true, first_name: true, last_name: true, personalInfo: { select: { profileImage: true, city: true, country: { select: { name: true } } } } } },
          user2: { select: { id: true, unique_id: true, first_name: true, last_name: true, personalInfo: { select: { profileImage: true, city: true, country: { select: { name: true } } } } } },
          messages: { orderBy: { created_at: "desc" }, take: 1 }
        },
        orderBy: { updated_at: "desc" },
        take: limit + 1
      });

      const hasMore = convos.length > limit;
      const slice = hasMore ? convos.slice(0, limit) : convos;

      const list = slice.map((c: any) => {
        const other = c.user1_id === userId ? c.user2 : c.user1;
        const lastMsg = c.messages[0];
        const profileImageUrl = toProfileImageUrl(other.personalInfo?.profileImage);
        const location = formatLocation(other.personalInfo?.city, other.personalInfo?.country?.name);
        return {
          id: c.id,
          unique_id: c.unique_id,
          otherParticipant: {
            id: other.id,
            unique_id: other.unique_id,
            first_name: other.first_name,
            last_name: other.last_name,
            profile_image: profileImageUrl,
            location: location || null
          },
          lastMessage: lastMsg ? { content: lastMsg.content, type: lastMsg.type, created_at: lastMsg.created_at } : null,
          updated_at: c.updated_at
        };
      });

      const last = slice[slice.length - 1];
      const nextCursor = hasMore && last ? last.updated_at?.toISOString?.() ?? null : null;

      return { success: true, message: "OK", data: { list, nextCursor, hasMore } };
    } catch (error: any) {
      console.error("listConversationsForUser Error:", error);
      return { success: false, message: error.message || "Failed to list conversations" };
    }
  }

  /**
   * Get conversation by unique_id if current user is a participant.
   */
  static async getConversationByUniqueId(uniqueId: string, userId: number): Promise<ServiceResponse<any>> {
    try {
      const c = await (prisma as any).conversation.findFirst({
        where: { unique_id: uniqueId },
        include: {
          user1: { select: { id: true, unique_id: true, first_name: true, last_name: true, personalInfo: { select: { profileImage: true, city: true, country: { select: { name: true } } } } } },
          user2: { select: { id: true, unique_id: true, first_name: true, last_name: true, personalInfo: { select: { profileImage: true, city: true, country: { select: { name: true } } } } } }
        }
      });
      if (!c) return { success: false, message: "Conversation not found" };
      if (c.user1_id !== userId && c.user2_id !== userId) return { success: false, message: "Forbidden" };
      const other = c.user1_id === userId ? c.user2 : c.user1;
      const location = formatLocation(other.personalInfo?.city, other.personalInfo?.country?.name);
      const otherParticipant = {
        id: other.id,
        unique_id: other.unique_id,
        first_name: other.first_name,
        last_name: other.last_name,
        profile_image: toProfileImageUrl(other.personalInfo?.profileImage),
        location: location || null
      };
      return {
        success: true,
        message: "OK",
        data: { id: c.id, unique_id: c.unique_id, otherParticipant, updated_at: c.updated_at }
      };
    } catch (error: any) {
      console.error("getConversationByUniqueId Error:", error);
      return { success: false, message: error.message || "Failed to get conversation" };
    }
  }

  /**
   * Get messages for a conversation (paginated). User must be participant.
   */
  static async getMessages(
    conversationUniqueId: string,
    userId: number,
    opts: { limit?: number; before?: string } = {}
  ): Promise<ServiceResponse<{ messages: any[]; hasMore: boolean }>> {
    try {
      const conv = await this.getConversationByUniqueId(conversationUniqueId, userId);
      if (!conv.success || !conv.data) return { success: false, message: conv.message };

      const limit = Math.max(1, Math.min(opts.limit ?? 20, 100));
      const cursor = opts.before
        ? await (prisma as any).message.findFirst({ where: { unique_id: opts.before } })
        : null;

      const messages = await (prisma as any).message.findMany({
        where: { conversation_id: conv.data.id },
        orderBy: { created_at: "desc" },
        take: limit + 1,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor.id } : undefined,
        include: { sender: { select: { id: true, first_name: true, last_name: true, personalInfo: { select: { profileImage: true } } } } }
      });

      const hasMore = messages.length > limit;
      const list = (hasMore ? messages.slice(0, limit) : messages).reverse();
      const formatted = list.slice(0, limit).map((m: any) => ({
        id: m.id,
        unique_id: m.unique_id,
        conversation_id: conv.data.unique_id,
        sender_id: m.sender_id,
        sender: m.sender
          ? {
              id: m.sender.id,
              first_name: m.sender.first_name,
              last_name: m.sender.last_name,
              profile_image: toProfileImageUrl(m.sender.personalInfo?.profileImage)
            }
          : null,
        type: m.type,
        content: m.content,
        metadata: metadataWithAttachmentUrls(m.metadata),
        created_at: m.created_at
      }));

      return { success: true, message: "OK", data: { messages: formatted, hasMore } };
    } catch (error: any) {
      console.error("getMessages Error:", error);
      return { success: false, message: error.message || "Failed to get messages" };
    }
  }

  /**
   * Search messages in a conversation by content (case-insensitive). User must be participant.
   */
  static async searchMessages(
    conversationUniqueId: string,
    userId: number,
    query: string
  ): Promise<ServiceResponse<{ messages: any[] }>> {
    try {
      const conv = await this.getConversationByUniqueId(conversationUniqueId, userId);
      if (!conv.success || !conv.data) return { success: false, message: conv.message };

      const trimmed = (query || "").trim();
      if (!trimmed) return { success: true, message: "OK", data: { messages: [] } };

      const limit = 100;
      const messages = await (prisma as any).message.findMany({
        where: {
          conversation_id: conv.data.id,
          content: { contains: trimmed, mode: "insensitive" }
        },
        orderBy: { created_at: "asc" },
        take: limit,
        include: { sender: { select: { id: true, first_name: true, last_name: true, personalInfo: { select: { profileImage: true } } } } }
      });

      const formatted = messages.map((m: any) => ({
        id: m.id,
        unique_id: m.unique_id,
        conversation_id: conv.data.unique_id,
        sender_id: m.sender_id,
        sender: m.sender
          ? {
              id: m.sender.id,
              first_name: m.sender.first_name,
              last_name: m.sender.last_name,
              profile_image: toProfileImageUrl(m.sender.personalInfo?.profileImage)
            }
          : null,
        type: m.type,
        content: m.content,
        metadata: metadataWithAttachmentUrls(m.metadata),
        created_at: m.created_at
      }));

      return { success: true, message: "OK", data: { messages: formatted } };
    } catch (error: any) {
      console.error("searchMessages Error:", error);
      return { success: false, message: error.message || "Failed to search messages" };
    }
  }

  /**
   * Send a user message. Returns the created message.
   */
  static async sendMessage(
    conversationUniqueId: string,
    userId: number,
    content: string,
    attachmentUrls?: string[],
    replyTo?: { messageId: number; unique_id: string; content: string; senderName?: string }
  ): Promise<ServiceResponse<any>> {
    try {
      const conv = await this.getConversationByUniqueId(conversationUniqueId, userId);
      if (!conv.success || !conv.data) return { success: false, message: conv.message };

      const trimmed = (content || "").trim();
      const hasAttachments = Array.isArray(attachmentUrls) && attachmentUrls.length > 0;
      if (!trimmed && !hasAttachments) return { success: false, message: "Content or attachments are required" };

      // Store relative paths only; map to full URLs when sending response
      const attachmentPaths = hasAttachments
        ? attachmentUrls!.map((url) => extractRelativePath(url)).filter(Boolean)
        : undefined;
      const metadata: any = {};
      if (attachmentPaths?.length) metadata.attachments = attachmentPaths;
      if (replyTo?.messageId && replyTo?.unique_id) metadata.replyTo = replyTo;
      const hasMetadata = Object.keys(metadata).length > 0;
      const msg = await (prisma as any).message.create({
        data: {
          conversation_id: conv.data.id,
          sender_id: userId,
          type: "USER",
          content: trimmed || "(attachment)",
          metadata: hasMetadata ? metadata : undefined
        },
        include: { sender: { select: { id: true, first_name: true, last_name: true, personalInfo: { select: { profileImage: true } } } } }
      });

      // Update conversation updated_at
      await (prisma as any).conversation.update({
        where: { id: conv.data.id },
        data: { updated_at: new Date() }
      });

      const receiverId = conv.data.otherParticipant.id;
      const senderPayload = msg.sender
        ? {
            id: msg.sender.id,
            first_name: msg.sender.first_name,
            last_name: msg.sender.last_name,
            profile_image: toProfileImageUrl(msg.sender.personalInfo?.profileImage)
          }
        : null;
      return {
        success: true,
        message: "Sent",
        data: {
          id: msg.id,
          unique_id: msg.unique_id,
          conversation_id: conv.data.unique_id,
          sender_id: msg.sender_id,
          sender: senderPayload,
          type: msg.type,
          content: msg.content,
          metadata: metadataWithAttachmentUrls(msg.metadata),
          created_at: msg.created_at,
          receiverId
        }
      };
    } catch (error: any) {
      console.error("sendMessage Error:", error);
      return { success: false, message: error.message || "Failed to send message" };
    }
  }
}
