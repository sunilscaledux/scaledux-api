import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";
import { emitNewMessageToBothUsers } from "./chatSocket";

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
   * Create a system message in a conversation (no sender).
   */
  static async createSystemMessage(
    conversationId: number,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<ServiceResponse<{ id: number; unique_id: string; type: string; content: string; metadata: any; created_at: Date }>> {
    try {
      const msg = await (prisma as any).message.create({
        data: {
          conversation_id: conversationId,
          sender_id: null,
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
   */
  static async syncSystemMessage(
    userId1: number,
    userId2: number,
    content: string,
    metadata?: Record<string, unknown>,
    projectId?: number
  ): Promise<ServiceResponse<{ conversationUniqueId: string }>> {
    const conv = await this.getOrCreateConversation(userId1, userId2, projectId);
    if (!conv.success || !conv.data) return { success: false, message: conv.message };

    const msg = await this.createSystemMessage(conv.data.id, content, metadata);
    if (!msg.success) return { success: false, message: msg.message };

    // Realtime: emit to conversation room and both user rooms
    const payload = {
      id: msg.data!.id,
      unique_id: msg.data!.unique_id,
      conversationId: conv.data.unique_id,
      senderId: null as number | null,
      type: msg.data!.type,
      content: msg.data!.content,
      metadata: msg.data!.metadata ?? undefined,
      createdAt: msg.data!.created_at
    };
    emitNewMessageToBothUsers(conv.data.unique_id, payload, userId1, userId2);

    return { success: true, message: "Synced", data: { conversationUniqueId: conv.data.unique_id } };
  }

  /**
   * List conversations for a user (with last message and other participant).
   */
  static async listConversationsForUser(userId: number): Promise<ServiceResponse<any[]>> {
    try {
      const convos = await (prisma as any).conversation.findMany({
        where: { OR: [{ user1_id: userId }, { user2_id: userId }] },
        include: {
          user1: { select: { id: true, unique_id: true, first_name: true, last_name: true } },
          user2: { select: { id: true, unique_id: true, first_name: true, last_name: true } },
          messages: { orderBy: { created_at: "desc" }, take: 1 }
        },
        orderBy: { updated_at: "desc" }
      });

      const list = convos.map((c: any) => {
        const other = c.user1_id === userId ? c.user2 : c.user1;
        const lastMsg = c.messages[0];
        return {
          id: c.id,
          unique_id: c.unique_id,
          otherParticipant: { id: other.id, unique_id: other.unique_id, first_name: other.first_name, last_name: other.last_name },
          lastMessage: lastMsg ? { content: lastMsg.content, type: lastMsg.type, created_at: lastMsg.created_at } : null,
          updated_at: c.updated_at
        };
      });

      return { success: true, message: "OK", data: list };
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
          user1: { select: { id: true, unique_id: true, first_name: true, last_name: true } },
          user2: { select: { id: true, unique_id: true, first_name: true, last_name: true } }
        }
      });
      if (!c) return { success: false, message: "Conversation not found" };
      if (c.user1_id !== userId && c.user2_id !== userId) return { success: false, message: "Forbidden" };
      const other = c.user1_id === userId ? c.user2 : c.user1;
      return {
        success: true,
        message: "OK",
        data: { id: c.id, unique_id: c.unique_id, otherParticipant: other, updated_at: c.updated_at }
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

      const limit = Math.min(opts.limit ?? 50, 100);
      const cursor = opts.before
        ? await (prisma as any).message.findFirst({ where: { unique_id: opts.before } })
        : null;

      const messages = await (prisma as any).message.findMany({
        where: { conversation_id: conv.data.id },
        orderBy: { created_at: "desc" },
        take: limit + 1,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor.id } : undefined,
        include: { sender: { select: { id: true, first_name: true, last_name: true } } }
      });

      const hasMore = messages.length > limit;
      const list = (hasMore ? messages.slice(0, limit) : messages).reverse();
      const formatted = list.map((m: any) => ({
        id: m.id,
        unique_id: m.unique_id,
        conversation_id: conv.data.unique_id,
        sender_id: m.sender_id,
        sender: m.sender,
        type: m.type,
        content: m.content,
        metadata: m.metadata,
        created_at: m.created_at
      }));

      return { success: true, message: "OK", data: { messages: formatted, hasMore } };
    } catch (error: any) {
      console.error("getMessages Error:", error);
      return { success: false, message: error.message || "Failed to get messages" };
    }
  }

  /**
   * Send a user message. Returns the created message.
   */
  static async sendMessage(
    conversationUniqueId: string,
    userId: number,
    content: string
  ): Promise<ServiceResponse<any>> {
    try {
      const conv = await this.getConversationByUniqueId(conversationUniqueId, userId);
      if (!conv.success || !conv.data) return { success: false, message: conv.message };

      const trimmed = (content || "").trim();
      if (!trimmed) return { success: false, message: "Content is required" };

      const msg = await (prisma as any).message.create({
        data: {
          conversation_id: conv.data.id,
          sender_id: userId,
          type: "USER",
          content: trimmed
        },
        include: { sender: { select: { id: true, first_name: true, last_name: true } } }
      });

      // Update conversation updated_at
      await (prisma as any).conversation.update({
        where: { id: conv.data.id },
        data: { updated_at: new Date() }
      });

      const receiverId = conv.data.otherParticipant.id;
      return {
        success: true,
        message: "Sent",
        data: {
          id: msg.id,
          unique_id: msg.unique_id,
          conversation_id: conv.data.unique_id,
          sender_id: msg.sender_id,
          sender: msg.sender,
          type: msg.type,
          content: msg.content,
          metadata: msg.metadata,
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
