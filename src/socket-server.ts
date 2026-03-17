
import './moduleAlias';
import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import express from 'express';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import socketConfig from '@config/socketConfig';
import { Log } from '@services/loggerService';
import redisClient from '@services/redisService';
import { ConversationService } from '@module/chat/ConversationService';
import { emitNewMessageWithIO, emitNewMessageToBothUsersWithIO } from '@module/chat/chatSocket';
import {
  createSocketEventsSubscriber,
  type SocketEventPayload
} from '@services/socketPubSub';

const app = express();
app.use(express.json());

const httpServer = http.createServer(app);

const io = new SocketServer(httpServer, {
  path: '/socket.io',
  cors: { origin: socketConfig.corsOrigin, credentials: true }
});

const ONLINE_USERS_SET_KEY = 'socket:online_users';
const onlineUserConnectionsKey = (userId: number) => `socket:online_user:${userId}:connections`;

async function markUserOnline(userId: number): Promise<void> {
  const count = await redisClient.incr(onlineUserConnectionsKey(userId));
  if (count === 1) {
    await redisClient.sadd(ONLINE_USERS_SET_KEY, String(userId));
  }
}

async function markUserOffline(userId: number): Promise<void> {
  const count = await redisClient.decr(onlineUserConnectionsKey(userId));
  if (count <= 0) {
    await redisClient.del(onlineUserConnectionsKey(userId));
    await redisClient.srem(ONLINE_USERS_SET_KEY, String(userId));
  }
}

async function isUserOnline(userId: number): Promise<boolean> {
  const exists = await redisClient.sismember(ONLINE_USERS_SET_KEY, String(userId));
  return exists === 1;
}

async function handleSocketEvent(payload: SocketEventPayload): Promise<void> {
  switch (payload.type) {
    case 'session_revoked':
      io.to(`user:${payload.userId}:device:${payload.deviceId}`).emit('session_revoked');
      break;
    case 'session_revoked_many':
      payload.deviceIds.forEach((id: number) => {
        io.to(`user:${payload.userId}:device:${id}`).emit('session_revoked');
      });
      break;
    case 'new_message': {
      const receiverOnline =
        typeof payload.receiverId === 'number' ? await isUserOnline(payload.receiverId) : false;
      emitNewMessageWithIO(
        io,
        payload.conversationId,
        payload.message,
        payload.receiverId,
        receiverOnline
      );
      break;
    }
    case 'new_message_both': {
      const [user1Online, user2Online] = await Promise.all([
        isUserOnline(payload.userId1),
        isUserOnline(payload.userId2)
      ]);
      emitNewMessageToBothUsersWithIO(
        io,
        payload.conversationId,
        payload.message,
        payload.userId1,
        payload.userId2,
        user1Online,
        user2Online
      );
      break;
    }
    case 'conversation_status':
      io.to(`user:${payload.userId}`).emit('conversation:status_updated', {
        conversationId: payload.conversationId,
        status: payload.status
      });
      break;
    default:
      Log.warn('Unknown socket event type', { payload: (payload as any)?.type });
  }
}

createSocketEventsSubscriber(handleSocketEvent);

app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Socket server is running' });
});

io.on('connection', (socket) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.cookie?.match(/auth_token=([^;]+)/)?.[1];
  if (!token) {
    if (process.env.NODE_ENV !== 'production') Log.debug('[socket] connection rejected: no token');
    socket.disconnect(true);
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { id: number };
    const userId = decoded.id;
    socket.data.userId = userId;
    socket.join(`user:${userId}`);
    markUserOnline(userId).catch((err) => {
      Log.warn('Failed to mark user online', { userId, err: err?.message || err });
    });
  } catch {
    if (process.env.NODE_ENV !== 'production') Log.debug('[socket] connection rejected: invalid token');
    socket.disconnect(true);
    return;
  }

  socket.on('join_conversation', async (conversationId: string) => {
    if (!conversationId || typeof conversationId !== 'string') return;
    const userId = socket.data.userId;
    const result = await ConversationService.getConversationByUniqueId(conversationId, userId);
    if (result.success) socket.join(`conversation:${conversationId}`);
  });

  socket.on('leave_conversation', (conversationId: string) => {
    if (conversationId) socket.leave(`conversation:${conversationId}`);
  });

  socket.on('typing_start', (payload: { conversationId: string; userName?: string }) => {
    const conversationId = payload?.conversationId;
    if (!conversationId || typeof conversationId !== 'string') return;
    const userName = typeof payload.userName === 'string' ? payload.userName : 'Someone';
    socket.to(`conversation:${conversationId}`).emit('conversation:typing', {
      userId: socket.data.userId,
      userName
    });
  });

  socket.on('typing_stop', (conversationId: string) => {
    if (!conversationId || typeof conversationId !== 'string') return;
    socket.to(`conversation:${conversationId}`).emit('conversation:typing_stop', {
      userId: socket.data.userId
    });
  });

  socket.on('register_device', (deviceId: number) => {
    const uid = socket.data.userId;
    if (typeof deviceId === 'number' && uid != null) {
      socket.join(`user:${uid}:device:${deviceId}`);
    }
  });

  socket.on('disconnect', () => {
    const userId = socket.data.userId;
    if (typeof userId === 'number') {
      markUserOffline(userId).catch((err) => {
        Log.warn('Failed to mark user offline', { userId, err: err?.message || err });
      });
    }
  });
});

httpServer.listen(socketConfig.port, () => {
  Log.info(`Socket server: http://localhost:${socketConfig.port}/socket.io`);
  Log.info('Ensure frontend uses this URL (NEXT_PUBLIC_SOCKET_URL or default :4001) and both API + socket processes are running.');
});

export default httpServer;
