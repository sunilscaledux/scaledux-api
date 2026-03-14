import { Server as SocketServer } from "socket.io";
import axios from "axios";
import socketConfig from "@config/socketConfig";
import { Log } from '@services/loggerService';

export type MessagePayload = {
  id: number;
  unique_id: string;
  conversationId: string;
  senderId: number | null;
  type: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};

/**
 * Emit using the given io instance (used by socket-server process).
 */
export function emitNewMessageWithIO(
  io: SocketServer,
  conversationUniqueId: string,
  message: MessagePayload,
  receiverUserId?: number,
  emitReceiverConversationEvent: boolean = true
) {
  const payload = { message };
  io.to(`conversation:${conversationUniqueId}`).emit("message:new", payload);
  if (receiverUserId != null && emitReceiverConversationEvent) {
    io.to(`user:${receiverUserId}`).emit("conversation:new_message", payload);
  }
}

/**
 * Emit to both users using the given io instance (used by socket-server process).
 */
export function emitNewMessageToBothUsersWithIO(
  io: SocketServer,
  conversationUniqueId: string,
  message: MessagePayload,
  userId1: number,
  userId2: number,
  emitUser1ConversationEvent: boolean = true,
  emitUser2ConversationEvent: boolean = true
) {
  const payload = { message };
  io.to(`conversation:${conversationUniqueId}`).emit("message:new", payload);
  if (emitUser1ConversationEvent) {
    io.to(`user:${userId1}`).emit("conversation:new_message", payload);
  }
  if (emitUser2ConversationEvent) {
    io.to(`user:${userId2}`).emit("conversation:new_message", payload);
  }
}

/**
 * Notify socket server via HTTP when API runs in a separate process (no Socket.IO).
 */
async function notifySocketServerViaHttp(
  type: "new_message" | "new_message_both" | "conversation_status",
  body: {
    conversationId: string;
    message?: MessagePayload;
    receiverId?: number;
    userId1?: number;
    userId2?: number;
    userId?: number;
    status?: string;
  }
) {
  try {
    await axios.post(`${socketConfig.serverUrl}/emit`, { type, ...body }, {
      headers: { "x-internal-secret": socketConfig.emitSecret },
      timeout: 5000
    });
  } catch (err: any) {
    Log.error(`Socket server notify failed (is socket server running on ${socketConfig.serverUrl}?)`, { err: err?.message || err });
  }
}

/**
 * Notify socket server to emit message:new and conversation:new_message (API has no Socket.IO; uses HTTP).
 */
export function emitNewMessage(
  conversationUniqueId: string,
  message: MessagePayload,
  receiverUserId?: number
) {
  notifySocketServerViaHttp("new_message", {
    conversationId: conversationUniqueId,
    message,
    receiverId: receiverUserId
  });
}

/**
 * Notify socket server to emit to both participants (e.g. system messages).
 */
export function emitNewMessageToBothUsers(
  conversationUniqueId: string,
  message: MessagePayload,
  userId1: number,
  userId2: number
) {
  notifySocketServerViaHttp("new_message_both", {
    conversationId: conversationUniqueId,
    message,
    userId1,
    userId2
  });
}

/**
 * Emit conversation status to a specific user so their client can refetch and update UI (disable/enable input).
 */
export function emitConversationStatusToUser(
  userId: number,
  conversationUniqueId: string,
  status: string
) {
  notifySocketServerViaHttp("conversation_status", {
    conversationId: conversationUniqueId,
    userId,
    status
  });
}
