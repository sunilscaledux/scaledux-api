
import './moduleAlias';
import dotenv from 'dotenv';
dotenv.config();

// Docker logs: winston may write mostly to files; keep critical lines on stdout
const bootLog = (msg: string) => process.stdout.write(`[scaledux-socket] ${msg}\n`);

import http from 'http';
import express from 'express';
import { Server as SocketServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import socketConfig from '@config/socketConfig';
import { Log } from '@services/loggerService';
import Redis from 'ioredis';
import redisConfig from '@config/redis';
import redisClient from '@services/redisService';
import { ConversationService } from '@module/chat/ConversationService';
import { emitNewMessageWithIO, emitNewMessageToBothUsersWithIO } from '@module/chat/chatSocket';
import { SOCKET_EVENTS_CHANNEL, type SocketEventPayload } from '@services/socketPubSub';

const app = express();
app.use(express.json());

const httpServer = http.createServer(app);

const io = new SocketServer(httpServer, {
  path: '/socket.io',
  cors: { origin: socketConfig.corsOrigin, credentials: true }
});

/** Same Redis as API; lets all socket replicas share Engine.IO sessions (fixes "Session ID unknown" behind LB). */
function socketIoRedisUrl(): string {
  const explicit = process.env.REDIS_URL?.trim();
  if (explicit) return explicit;
  const host = process.env.REDIS_HOST || 'localhost';
  const port = process.env.REDIS_PORT || '6379';
  const password = process.env.REDIS_PASSWORD;
  const db = process.env.REDIS_DB || '0';
  if (password) {
    return `redis://:${encodeURIComponent(password)}@${host}:${port}/${db}`;
  }
  return `redis://${host}:${port}/${db}`;
}

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
      emitNewMessageWithIO(io, payload.conversationId, payload.message, payload.receiverId);
      break;
    }
    case 'new_message_both': {
      emitNewMessageToBothUsersWithIO(
        io,
        payload.conversationId,
        payload.message,
        payload.userId1,
        payload.userId2
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

const socketEventsRedisSub = new Redis(redisConfig);
socketEventsRedisSub.subscribe(SOCKET_EVENTS_CHANNEL, (err) => {
  if (err) Log.error('Socket events subscribe error', { err: err?.message });
  else Log.info(`Subscribed to Redis channel: ${SOCKET_EVENTS_CHANNEL}`);
});
socketEventsRedisSub.on('message', (channel, message) => {
  if (channel !== SOCKET_EVENTS_CHANNEL) return;
  let payload: SocketEventPayload;
  try {
    payload = JSON.parse(message) as SocketEventPayload;
  } catch {
    Log.error('Invalid socket event payload', { raw: message });
    return;
  }
  void (async () => {
    try {
      await handleSocketEvent(payload);
    } catch (e) {
      Log.error('Socket event handler error', { err: (e as Error)?.message });
    }
  })();
});
socketEventsRedisSub.on('error', (err) => Log.error('Socket events subscriber error', { err: err?.message }));

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
    if (result.success) {
      socket.join(`conversation:${conversationId}`);
    } else if (process.env.NODE_ENV === 'production') {
      Log.warn('[socket] join_conversation denied', {
        conversationId,
        userId,
        message: result.message
      });
    }
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

async function startSocketServer(): Promise<void> {
  if (process.env.SOCKET_IO_DISABLE_REDIS_ADAPTER === 'true') {
    Log.warn(
      '[socket] SOCKET_IO_DISABLE_REDIS_ADAPTER=true — single replica only, or use sticky sessions at the proxy'
    );
  } else {
    try {
      const url = socketIoRedisUrl();
      const pubClient = createClient({ url });
      const subClient = pubClient.duplicate();
      pubClient.on('error', (err) => Log.error('[socket-io-redis] pub client', { err: String(err) }));
      subClient.on('error', (err) => Log.error('[socket-io-redis] sub client', { err: String(err) }));
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      bootLog('Redis adapter enabled');
      Log.info('[socket] Redis adapter on — Engine.IO sessions work across multiple instances / load balancers');
    } catch (e) {
      const msg = (e as Error)?.message || String(e);
      bootLog(`ERROR: Redis adapter failed (${msg}) — continuing without adapter (single replica OK). Use REDIS_URL=rediss://... for TLS or SOCKET_IO_DISABLE_REDIS_ADAPTER=true`);
      Log.error('[socket] Failed to attach Redis adapter', { err: msg });
      Log.warn('[socket] Continuing without Redis adapter');
    }
  }

  httpServer.listen(socketConfig.port, () => {
    bootLog(`listening on port ${socketConfig.port} (path /socket.io)`);
    Log.info(`Socket server: http://localhost:${socketConfig.port}/socket.io`);
  });
}

bootLog('starting…');
void startSocketServer().catch((e) => {
  const m = (e as Error)?.message || String(e);
  bootLog(`FATAL: ${m}`);
  Log.error('[socket] Fatal startup error', { err: m });
  process.exit(1);
});

export default httpServer;
