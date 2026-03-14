/**
 * Standalone Socket.IO server (same app, separate process).
 * Run alongside server.ts so the API and real-time layer use separate event loops.
 * API notifies this process via POST /emit (internal secret required).
 */
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

// Internal endpoint: API process POSTs here to trigger socket emits (no Socket.IO in API process)
app.post('/emit', async (req, res) => {
  const secret = req.headers['x-internal-secret'] || req.body?.secret;
  if (secret !== socketConfig.emitSecret) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }
  const { type, conversationId, message, receiverId, userId1, userId2, userId, status, deviceId, deviceIds } = req.body || {};
  if (!type) {
    res.status(400).json({ ok: false, error: 'Missing type' });
    return;
  }
  try {
    if (type === 'session_revoked') {
      if (typeof userId !== 'number' || deviceId == null) {
        res.status(400).json({ ok: false, error: 'userId and deviceId required for session_revoked' });
        return;
      }
      io.to(`user:${userId}:device:${deviceId}`).emit('session_revoked');
    } else if (type === 'session_revoked_many') {
      if (typeof userId !== 'number' || !Array.isArray(deviceIds)) {
        res.status(400).json({ ok: false, error: 'userId and deviceIds[] required for session_revoked_many' });
        return;
      }
      deviceIds.forEach((id: number) => {
        io.to(`user:${userId}:device:${id}`).emit('session_revoked');
      });
    } else if (type === 'new_message') {
      if (!conversationId || !message) {
        res.status(400).json({ ok: false, error: 'conversationId and message required for new_message' });
        return;
      }
      const receiverOnline = typeof receiverId === 'number'
        ? await isUserOnline(receiverId)
        : false;
      emitNewMessageWithIO(io, conversationId, message, receiverId, receiverOnline);
    } else if (type === 'new_message_both') {
      if (!conversationId || !message) {
        res.status(400).json({ ok: false, error: 'conversationId and message required for new_message_both' });
        return;
      }
      if (typeof userId1 !== 'number' || typeof userId2 !== 'number') {
        res.status(400).json({ ok: false, error: 'userId1 and userId2 required for new_message_both' });
        return;
      }
      const [user1Online, user2Online] = await Promise.all([
        isUserOnline(userId1),
        isUserOnline(userId2)
      ]);
      emitNewMessageToBothUsersWithIO(io, conversationId, message, userId1, userId2, user1Online, user2Online);
    } else if (type === 'conversation_status') {
      if (typeof userId !== 'number' || !conversationId || !status) {
        res.status(400).json({ ok: false, error: 'userId, conversationId and status required for conversation_status' });
        return;
      }
      io.to(`user:${userId}`).emit('conversation:status_updated', { conversationId, status });
    } else {
      res.status(400).json({ ok: false, error: 'Unknown type' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    Log.error('Emit error', { err });
    res.status(500).json({ ok: false, error: 'Emit failed' });
  }
});
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
