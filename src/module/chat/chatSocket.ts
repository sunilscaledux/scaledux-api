import { getIO } from "@config/socket";

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
 * Emit message:new to conversation room and conversation:new_message to receiver's user room.
 * Call after creating a message (user or system).
 */
export function emitNewMessage(conversationUniqueId: string, message: MessagePayload, receiverUserId?: number) {
  const io = getIO();
  if (!io) return;
  const payload = { message };
  io.to(`conversation:${conversationUniqueId}`).emit("message:new", payload);
  if (receiverUserId) {
    io.to(`user:${receiverUserId}`).emit("conversation:new_message", payload);
  }
}

/**
 * Emit to both participants' user rooms (e.g. for system messages).
 */
export function emitNewMessageToBothUsers(
  conversationUniqueId: string,
  message: MessagePayload,
  userId1: number,
  userId2: number
) {
  const io = getIO();
  if (!io) return;
  const payload = { message };
  io.to(`conversation:${conversationUniqueId}`).emit("message:new", payload);
  io.to(`user:${userId1}`).emit("conversation:new_message", payload);
  io.to(`user:${userId2}`).emit("conversation:new_message", payload);
}
