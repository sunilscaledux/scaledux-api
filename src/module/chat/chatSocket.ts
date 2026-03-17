import { Server as SocketServer } from "socket.io";
import { publishSocketEvent } from "@services/socketPubSub";

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

export function emitConversationStatusToUser(
  userId: number,
  conversationUniqueId: string,
  status: string
) {
  publishSocketEvent({ type: "conversation_status", userId, conversationId: conversationUniqueId, status });
}
