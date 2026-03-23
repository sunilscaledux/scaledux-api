import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";
import { resolveAttachmentUrl, resolveAttachmentUrls, urlsOrPathsToAttachmentIds, markAttachmentsAttached } from "@services/attachmentService";
import { emitConversationStatusToUser } from "./chatSocket";
import { publishSocketEvent } from "@services/socketPubSub";
import { Log } from '@services/loggerService';
import { getDisplayName } from '@utils/General';

async function toProfileImageUrl(profileImage: string | null | undefined): Promise<string | null> {
  if (!profileImage) return null;
  const url = await resolveAttachmentUrl(profileImage, 'profile_image');
  return url || null;
}

/** Map message metadata.attachments (ids) to full URLs (includes original filename). */
async function metadataWithAttachmentUrls(metadata: any): Promise<any> {
  if (!metadata || typeof metadata !== "object") return metadata;
  const attachments = metadata.attachments;
  if (!Array.isArray(attachments) || attachments.length === 0) return metadata;
  const urls = await resolveAttachmentUrls(attachments, 'attachments');
  return {
    ...metadata,
    attachments: urls,
  };
}

function formatLocation(city: string | null | undefined, countryName: string | null | undefined): string | null {
  const parts = [city, countryName].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

/** Resolve display content for SYSTEM messages with messageSent/messageReceived in metadata. */
function resolveSystemMessageContent(
  type: string,
  content: string,
  metadata: any,
  senderId: number | null,
  viewerUserId: number
): string {
  if (type !== "SYSTEM" || !metadata || typeof metadata !== "object") return content;
  const sent = metadata.messageSent;
  const received = metadata.messageReceived;
  if (sent == null || received == null) return content;
  const base = senderId === viewerUserId ? String(sent) : String(received);
  if (metadata.activityType === "request_modify" && metadata.message) {
    const msg = String(metadata.message).trim();
    return msg ? `${base}\n\n${msg}` : base;
  }
  if (metadata.activityType === "deliverable_submitted") {
    const projectTitle = metadata.projectTitle ? ` ${String(metadata.projectTitle).trim()}` : "";
    const deliverableDesc = metadata.deliverableDescription ? `: ${String(metadata.deliverableDescription).trim()}` : "";
    return `${base}${projectTitle}${deliverableDesc}`.trim();
  }
  if (metadata.activityType === "deliverable_request_changes" && (metadata.message || metadata.feedback)) {
    const msg = String(metadata.message || metadata.feedback || "").trim();
    const projectTitle = metadata.projectTitle ? ` ${String(metadata.projectTitle).trim()}` : "";
    const deliverableDesc = metadata.deliverableDescription ? `: ${String(metadata.deliverableDescription).trim()}` : "";
    const baseWithContext = `${base}${projectTitle}${deliverableDesc}`.trim();
    return msg ? `${baseWithContext}\n\n${msg}` : baseWithContext;
  }
  if (metadata.activityType === "proposal_status" && metadata.message) {
    const msg = String(metadata.message).trim();
    return msg ? `${base}\n\n${msg}` : base;
  }
  if (metadata.activityType === "offer_cancelled" && metadata.message) {
    const msg = String(metadata.message).trim();
    return msg ? `${base}\n\n${msg}` : base;
  }
  if (metadata.activityType === "payment_release" && metadata.projectTitle) {
    return `${base} ${String(metadata.projectTitle).trim()}`.trim();
  }
  if (metadata.activityType === "payment_released" && metadata.milestoneTitle) {
    return `${base}: ${String(metadata.milestoneTitle).trim()}`.trim();
  }
  return base;
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
  /**
   * Get or create a single conversation between two users.
   * Conversation is not scoped to a project — one thread per user pair for all context (chat, invites, proposals, etc.).
   */
  static async getOrCreateConversation(
    userId1: number,
    userId2: number,
    _projectId?: number
  ): Promise<ServiceResponse<{ id: number; unique_id: string }>> {
    try {
      const [u1, u2] = userId1 <= userId2 ? [userId1, userId2] : [userId2, userId1];

      const existing = await (prisma as any).conversation.findFirst({
        where: { user1_id: u1, user2_id: u2 },
        orderBy: { updated_at: "desc" }
      });

      if (existing) {
        return { success: true, message: "Conversation found", data: { id: existing.id, unique_id: existing.unique_id } };
      }

      const created = await (prisma as any).conversation.create({
        data: {
          user1_id: u1,
          user2_id: u2,
          status: "NOT_ACCEPTED"
        }
      });

      return { success: true, message: "Conversation created", data: { id: created.id, unique_id: created.unique_id } };
    } catch (error: any) {
      Log.error("Error", { error });
      return { success: false, message: error.message || "Failed to get or create conversation" };
    }
  }

  /**
   * Set conversation status to ACCEPTED (e.g. when receiver accepts project invite). Call from
   * FounderProjectService.acceptInvitation or similar.
   * Uses the single conversation between project owner and receiver (no project_id filter).
   */
  static async setConversationStatusAcceptedByProject(
    projectId: number,
    receiverUserId: number
  ): Promise<void> {
    const project = await (prisma as any).founderProject.findFirst({
      where: { id: projectId },
      select: { user_id: true }
    });
    if (!project) return;
    const [u1, u2] = project.user_id <= receiverUserId
      ? [project.user_id, receiverUserId]
      : [receiverUserId, project.user_id];
    await (prisma as any).conversation.updateMany({
      where: { user1_id: u1, user2_id: u2 },
      data: { status: "ACCEPTED" }
    });
  }

  /**
   * Get minimal user info by id for "new chat" header (no conversation created). Returns 404 if not found or if userId is current user.
   */
  static async getChatUserById(
    userId: number,
    otherUserId: number
  ): Promise<ServiceResponse<{ id: number; unique_id: string | null; first_name: string; last_name: string | null; profile_image: string | null }>> {
    if (otherUserId === userId) return { success: false, message: "User not found" };
    const u = await (prisma as any).user.findFirst({
      where: { id: otherUserId },
      select: { id: true, unique_id: true, first_name: true, last_name: true, personalInfo: { select: { profileImage: true } } }
    });
    if (!u) return { success: false, message: "User not found" };
    return {
      success: true,
      message: "OK",
      data: {
        id: u.id,
        unique_id: u.unique_id ?? null,
        first_name: u.first_name,
        last_name: getDisplayName({ first_name: u.first_name, last_name: u.last_name }, { maskLastName: true }).lastName,
        profile_image: await toProfileImageUrl(u.personalInfo?.profileImage)
      }
    };
  }

  /**
   * Find a conversation between current user and another user (by other's unique_id).
   * Looks up by user primary keys (user1_id, user2_id). Returns any conversation between
   * the two users (with or without project_id) so proposal/context conversations are found.
   * Returns conversation unique_id if found, and otherUserId (id) so frontend can open new-chat when not found.
   */
  static async findConversationByOtherUserUniqueId(
    currentUserId: number,
    otherUserUniqueId: string
  ): Promise<ServiceResponse<{ conversationUniqueId?: string; otherUserId: number }>> {
    try {
      const other = await (prisma as any).user.findFirst({
        where: { unique_id: otherUserUniqueId },
        select: { id: true }
      });
      if (!other) return { success: false, message: "User not found" };
      const otherUserId = other.id as number;
      if (otherUserId === currentUserId) return { success: false, message: "User not found" };

      const [u1, u2] = currentUserId <= otherUserId ? [currentUserId, otherUserId] : [otherUserId, currentUserId];
      const conv = await (prisma as any).conversation.findFirst({
        where: { user1_id: u1, user2_id: u2 },
        orderBy: { updated_at: "desc" }
      });
      return {
        success: true,
        message: "OK",
        data: {
          ...(conv ? { conversationUniqueId: conv.unique_id } : {}),
          otherUserId
        }
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return { success: false, message: error.message || "Failed to find conversation" };
    }
  }

  /**
   * Search users by name or email for starting a chat. Excludes current user. Returns at most 15.
   */
  static async searchUsersForChat(
    currentUserId: number,
    query: string
  ): Promise<ServiceResponse<{ users: Array<{ id: number; unique_id: string | null; first_name: string; last_name: string | null; profile_image: string | null }> }>> {
    try {
      const q = (query || "").trim();
      if (q.length === 0) {
        return { success: true, message: "OK", data: { users: [] } };
      }
      const users = await (prisma as any).user.findMany({
        where: {
          id: { not: currentUserId },
          OR: [
            { first_name: { contains: q, mode: "insensitive" } },
            { last_name: { contains: q, mode: "insensitive" } },
            ...(q.includes("@") ? [{ email: { contains: q, mode: "insensitive" } }] : [])
          ]
        },
        select: {
          id: true,
          unique_id: true,
          first_name: true,
          last_name: true,
          personalInfo: { select: { profileImage: true } }
        },
        take: 15
      });
      const list = await Promise.all(users.map(async (u: any) => ({
        id: u.id,
        unique_id: u.unique_id ?? null,
        first_name: u.first_name,
        last_name: getDisplayName({ first_name: u.first_name, last_name: u.last_name }, { maskLastName: true }).lastName,
        profile_image: await toProfileImageUrl(u.personalInfo?.profileImage)
      })));
      return { success: true, message: "OK", data: { users: list } };
    } catch (error: any) {
      Log.error("Error", { error });
      return { success: false, message: error.message || "Failed to search users" };
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
      Log.error("Error", { error });
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

    // Bump conversation updated_at so this chat appears at top of list; mark new message for the other user when initiator is set
    const data: Record<string, unknown> = { updated_at: new Date() };
    if (initiatorUserId != null) {
      const [u1] = userId1 <= userId2 ? [userId1, userId2] : [userId2, userId1];
      const receiverId = initiatorUserId === userId1 ? userId2 : userId1;
      data[receiverId === u1 ? "user1_has_new_message" : "user2_has_new_message"] = true;
    }
    await (prisma as any).conversation.update({
      where: { id: conv.data.id },
      data
    });

    // Realtime: publish to Redis (socket-server subscribes and emits)
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
    await publishSocketEvent({
      type: "new_message_both",
      conversationId: conv.data.unique_id,
      message: payload,
      userId1,
      userId2
    });

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

      const list = await Promise.all(slice.map(async (c: any) => {
        const other = c.user1_id === userId ? c.user2 : c.user1;
        const lastMsg = c.messages[0];
        const lastContent = lastMsg
          ? resolveSystemMessageContent(lastMsg.type, lastMsg.content, lastMsg.metadata, lastMsg.sender_id, userId)
          : null;
        const profileImageUrl = await toProfileImageUrl(other.personalInfo?.profileImage);
        const location = formatLocation(other.personalInfo?.city, other.personalInfo?.country?.name);
        const new_message = c.user1_id === userId ? !!c.user1_has_new_message : !!c.user2_has_new_message;
        return {
          id: c.id,
          unique_id: c.unique_id,
          otherParticipant: {
            id: other.id,
            unique_id: other.unique_id,
            first_name: other.first_name,
            last_name: getDisplayName({ first_name: other.first_name, last_name: other.last_name }, { maskLastName: true }).lastName,
            profile_image: profileImageUrl,
            location: location || null
          },
          lastMessage: lastMsg ? { content: lastContent, type: lastMsg.type, created_at: lastMsg.created_at } : null,
          updated_at: c.updated_at,
          new_message
        };
      }));

      const last = slice[slice.length - 1];
      const nextCursor = hasMore && last ? last.updated_at?.toISOString?.() ?? null : null;

      return { success: true, message: "OK", data: { list, nextCursor, hasMore } };
    } catch (error: any) {
      Log.error("Error", { error });
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
      const blockRows = await (prisma as any).$queryRawUnsafe(
        "SELECT status, blocked_by_user_id FROM scd_conversations WHERE id = $1 LIMIT 1",
        c.id
      ) as Array<{ status: string | null; blocked_by_user_id: number | null }>;
      const blockRow = blockRows[0];
      const status = blockRow?.status ?? (c as any).status ?? null;
      const blockedByUserId = blockRow?.blocked_by_user_id ?? (c as any).blocked_by_user_id ?? null;
      const other = c.user1_id === userId ? c.user2 : c.user1;
      const location = formatLocation(other.personalInfo?.city, other.personalInfo?.country?.name);
      const otherParticipant = {
        id: other.id,
        unique_id: other.unique_id,
        first_name: other.first_name,
        last_name: getDisplayName({ first_name: other.first_name, last_name: other.last_name }, { maskLastName: true }).lastName,
        profile_image: await toProfileImageUrl(other.personalInfo?.profileImage),
        location: location || null
      };
      const firstUserMsg = await (prisma as any).message.findFirst({
        where: { conversation_id: c.id, type: "USER" },
        orderBy: { created_at: "asc" },
        select: { sender_id: true }
      });
      const isInitiator = firstUserMsg?.sender_id != null && userId === firstUserMsg.sender_id;
      const receiverAccepted = status === "ACCEPTED";
      const isBlocked = status === "BLOCKED";
      const blockedByMe = isBlocked && blockedByUserId != null && blockedByUserId === userId;
      return {
        success: true,
        message: "OK",
        data: {
          id: c.id,
          unique_id: c.unique_id,
          user1_id: c.user1_id,
          user2_id: c.user2_id,
          otherParticipant,
          updated_at: c.updated_at,
          status: status ?? null,
          receiverAccepted,
          isInitiator,
          isBlocked,
          blockedByMe
        }
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return { success: false, message: error.message || "Failed to get conversation" };
    }
  }

  /**
   * Mark conversation as read for the current user (sets new_message = false for this participant).
   * Uses raw update so updated_at is NOT changed — list order stays by last message/activity only.
   */
  static async markConversationAsRead(conversationUniqueId: string, userId: number): Promise<ServiceResponse<void>> {
    try {
      const conv = await this.getConversationByUniqueId(conversationUniqueId, userId);
      if (!conv.success || !conv.data) return { success: false, message: conv.message };

      const c = await (prisma as any).conversation.findFirst({
        where: { unique_id: conversationUniqueId },
        select: { id: true, user1_id: true, user2_id: true }
      });
      if (!c) return { success: false, message: "Conversation not found" };
      if (c.user1_id !== userId && c.user2_id !== userId) return { success: false, message: "Forbidden" };

      const column = c.user1_id === userId ? "user1_has_new_message" : "user2_has_new_message";
      await (prisma as any).$executeRawUnsafe(
        `UPDATE scd_conversations SET ${column} = false WHERE id = $1`,
        c.id
      );
      return { success: true, message: "OK" };
    } catch (error: any) {
      Log.error("Error", { error });
      return { success: false, message: error.message || "Failed to mark as read" };
    }
  }

  /**
   * Block conversation: neither participant can send messages. Only the blocker can unblock.
   * Uses raw update so updated_at is NOT changed.
   */
  static async blockConversation(conversationUniqueId: string, userId: number): Promise<ServiceResponse<void>> {
    try {
      const c = await (prisma as any).conversation.findFirst({
        where: { unique_id: conversationUniqueId },
        select: { id: true, user1_id: true, user2_id: true }
      });
      if (!c) return { success: false, message: "Conversation not found" };
      if (c.user1_id !== userId && c.user2_id !== userId) return { success: false, message: "Forbidden" };
      await (prisma as any).$executeRawUnsafe(
        "UPDATE scd_conversations SET status = $1, blocked_by_user_id = $2 WHERE id = $3",
        "BLOCKED",
        userId,
        c.id
      );
      return { success: true, message: "OK" };
    } catch (error: any) {
      Log.error("Error", { error });
      return { success: false, message: error.message || "Failed to block" };
    }
  }

  /**
   * Unblock conversation. Only the user who blocked can unblock.
   * Uses raw query for blocked_by_user_id so it works even if Prisma client was not regenerated.
   */
  static async unblockConversation(conversationUniqueId: string, userId: number): Promise<ServiceResponse<void>> {
    try {
      const c = await (prisma as any).conversation.findFirst({
        where: { unique_id: conversationUniqueId },
        select: { id: true, user1_id: true, user2_id: true }
      });
      if (!c) return { success: false, message: "Conversation not found" };
      if (c.user1_id !== userId && c.user2_id !== userId) return { success: false, message: "Forbidden" };
      const blockRows = await (prisma as any).$queryRawUnsafe(
        "SELECT blocked_by_user_id FROM scd_conversations WHERE id = $1 LIMIT 1",
        c.id
      ) as Array<{ blocked_by_user_id: number | null }>;
      const blockedBy = blockRows[0]?.blocked_by_user_id ?? null;
      if (blockedBy != null && blockedBy !== userId) return { success: false, message: "Only the person who blocked can unblock" };
      await (prisma as any).$executeRawUnsafe(
        "UPDATE scd_conversations SET status = $1, blocked_by_user_id = $2 WHERE id = $3",
        "ACCEPTED",
        null,
        c.id
      );
      return { success: true, message: "OK" };
    } catch (error: any) {
      Log.error("Error", { error });
      return { success: false, message: error.message || "Failed to unblock" };
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
      const formatted = await Promise.all(list.slice(0, limit).map(async (m: any) => {
        const meta = await metadataWithAttachmentUrls(m.metadata);
        const content = resolveSystemMessageContent(m.type, m.content, meta, m.sender_id, userId);
        return {
          id: m.id,
          unique_id: m.unique_id,
          conversation_id: conv.data.unique_id,
          sender_id: m.sender_id,
          sender: m.sender
            ? {
                id: m.sender.id,
                first_name: m.sender.first_name,
                last_name: getDisplayName({ first_name: m.sender.first_name, last_name: m.sender.last_name }, { maskLastName: true }).lastName,
                profile_image: await toProfileImageUrl(m.sender.personalInfo?.profileImage)
              }
            : null,
          type: m.type,
          content,
          metadata: meta,
          created_at: m.created_at
        };
      }));

      return { success: true, message: "OK", data: { messages: formatted, hasMore } };
    } catch (error: any) {
      Log.error("Error", { error });
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

      const formatted = await Promise.all(messages.map(async (m: any) => {
        const meta = await metadataWithAttachmentUrls(m.metadata);
        const content = resolveSystemMessageContent(m.type, m.content, meta, m.sender_id, userId);
        return {
          id: m.id,
          unique_id: m.unique_id,
          conversation_id: conv.data.unique_id,
          sender_id: m.sender_id,
          sender: m.sender
            ? {
                id: m.sender.id,
                first_name: m.sender.first_name,
                last_name: getDisplayName({ first_name: m.sender.first_name, last_name: m.sender.last_name }, { maskLastName: true }).lastName,
                profile_image: await toProfileImageUrl(m.sender.personalInfo?.profileImage)
              }
            : null,
          type: m.type,
          content,
          metadata: meta,
          created_at: m.created_at
        };
      }));

      return { success: true, message: "OK", data: { messages: formatted } };
    } catch (error: any) {
      Log.error("Error", { error });
      return { success: false, message: error.message || "Failed to search messages" };
    }
  }

  /**
   * Send a user message. Returns the created message.
   * When skipEmit is true, no socket emit is called (used by message queue worker; worker publishes to Redis).
   * When skipEmit and a status update would have been emitted, returns statusUpdate for the worker to publish.
   */
  static async sendMessage(
    conversationUniqueId: string,
    userId: number,
    content: string,
    attachmentUrls?: string[],
    replyTo?: { messageId: number; unique_id: string; content: string; senderName?: string },
    options?: { skipEmit?: boolean }
  ): Promise<ServiceResponse<any>> {
    try {
      const conv = await this.getConversationByUniqueId(conversationUniqueId, userId);
      if (!conv.success || !conv.data) return { success: false, message: conv.message };

      const convStatus = (conv.data as any).status as string | null | undefined;
      if (convStatus === "BLOCKED") {
        return {
          success: false,
          message: "This conversation is blocked",
          statusCode: 403
        };
      }
      const firstUserMessage = await (prisma as any).message.findFirst({
        where: { conversation_id: conv.data.id, type: "USER" },
        orderBy: { created_at: "asc" },
        select: { sender_id: true }
      });
      const initiatorId = firstUserMessage?.sender_id ?? null;
      if (initiatorId != null && userId === initiatorId && convStatus === "NOT_ACCEPTED") {
        return {
          success: false,
          message: "You cannot send another message until the receiver accepts or replies",
          statusCode: 403
        };
      }

      const trimmed = (content || "").trim();
      const hasAttachments = Array.isArray(attachmentUrls) && attachmentUrls.length > 0;
      if (!trimmed && !hasAttachments) return { success: false, message: "Content or attachments are required" };

      const attachmentPaths = hasAttachments ? urlsOrPathsToAttachmentIds(attachmentUrls!) : undefined;
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

      if (attachmentPaths?.length) {
        const receiverId = conv.data.otherParticipant.id;
        markAttachmentsAttached(attachmentPaths, [userId, receiverId]).catch((e) =>
          Log.error('markAttachmentsAttached failed', { error: e })
        );
      }

      let statusUpdate: string | undefined;
      if (firstUserMessage == null) statusUpdate = "NOT_ACCEPTED";
      else if (msg.sender_id !== firstUserMessage.sender_id) statusUpdate = "ACCEPTED";
      const isUser1 = conv.data.user1_id === userId;
      const sendUpdateData: Record<string, unknown> = {
        updated_at: new Date(),
        ...(statusUpdate != null ? { status: statusUpdate } : {}),
        ...(isUser1 ? { user2_has_new_message: true } : { user1_has_new_message: true })
      };
      await (prisma as any).conversation.update({
        where: { id: conv.data.id },
        data: sendUpdateData
      });
      let statusUpdatePayload: { conversationId: string; status: string; userId: number } | undefined;
      if (statusUpdate != null && !options?.skipEmit) {
        if (statusUpdate === "NOT_ACCEPTED") {
          emitConversationStatusToUser(userId, conv.data.unique_id, statusUpdate);
        } else if (statusUpdate === "ACCEPTED" && convStatus === "NOT_ACCEPTED" && firstUserMessage?.sender_id != null) {
          emitConversationStatusToUser(firstUserMessage.sender_id, conv.data.unique_id, statusUpdate);
        }
      } else if (statusUpdate != null && options?.skipEmit) {
        const targetUserId = statusUpdate === "NOT_ACCEPTED" ? userId : (firstUserMessage?.sender_id ?? userId);
        statusUpdatePayload = { conversationId: conv.data.unique_id, status: statusUpdate, userId: targetUserId };
      }

      const receiverId = conv.data.otherParticipant.id;
      const senderPayload = msg.sender
        ? {
            id: msg.sender.id,
            first_name: msg.sender.first_name,
            last_name: getDisplayName({ first_name: msg.sender.first_name, last_name: msg.sender.last_name }, { maskLastName: true }).lastName,
            profile_image: await toProfileImageUrl(msg.sender.personalInfo?.profileImage)
          }
        : null;
      const response: ServiceResponse<any> = {
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
          metadata: await metadataWithAttachmentUrls(msg.metadata),
          created_at: msg.created_at,
          receiverId
        }
      };
      if (statusUpdatePayload) (response as any).statusUpdate = statusUpdatePayload;
      return response;
    } catch (error: any) {
      Log.error("Error", { error });
      return { success: false, message: error.message || "Failed to send message" };
    }
  }
}
