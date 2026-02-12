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
import { ConversationService } from '@module/chat/ConversationService';
import { emitNewMessageWithIO, emitNewMessageToBothUsersWithIO } from '@module/chat/chatSocket';

const app = express();
app.use(express.json());

const httpServer = http.createServer(app);

const io = new SocketServer(httpServer, {
  path: '/socket.io',
  cors: { origin: socketConfig.corsOrigin, credentials: true }
});

// Internal endpoint: API process POSTs here to trigger socket emits (no Socket.IO in API process)
app.post('/emit', (req, res) => {
  const secret = req.headers['x-internal-secret'] || req.body?.secret;
  if (secret !== socketConfig.emitSecret) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }
  const { type, conversationId, message, receiverId, userId1, userId2 } = req.body || {};
  if (!type || !conversationId || !message) {
    res.status(400).json({ ok: false, error: 'Missing type, conversationId, or message' });
    return;
  }
  try {
    if (type === 'new_message') {
      emitNewMessageWithIO(io, conversationId, message, receiverId);
      if (process.env.NODE_ENV !== 'production') {
        console.log('[socket] emitted new_message', conversationId, 'to receiver', receiverId);
      }
    } else if (type === 'new_message_both') {
      if (typeof userId1 !== 'number' || typeof userId2 !== 'number') {
        res.status(400).json({ ok: false, error: 'userId1 and userId2 required for new_message_both' });
        return;
      }
      emitNewMessageToBothUsersWithIO(io, conversationId, message, userId1, userId2);
    } else {
      res.status(400).json({ ok: false, error: 'Unknown type' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Emit error:', err);
    res.status(500).json({ ok: false, error: 'Emit failed' });
  }
});

io.on('connection', (socket) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.cookie?.match(/auth_token=([^;]+)/)?.[1];
  if (!token) {
    if (process.env.NODE_ENV !== 'production') console.log('[socket] connection rejected: no token');
    socket.disconnect(true);
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { id: number };
    const userId = decoded.id;
    socket.data.userId = userId;
    socket.join(`user:${userId}`);
  } catch {
    if (process.env.NODE_ENV !== 'production') console.log('[socket] connection rejected: invalid token');
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
});

httpServer.listen(socketConfig.port, () => {
  console.log(`🔌 Socket server: http://localhost:${socketConfig.port}/socket.io`);
  console.log(`   Ensure frontend uses this URL (NEXT_PUBLIC_SOCKET_URL or default :4001) and both API + socket processes are running.`);
});

export default httpServer;
