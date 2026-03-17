/**
 * Redis Pub/Sub for socket events (replaces HTTP POST /emit for realtime).
 * API and workers publish; socket-server subscribes and emits to clients.
 */
import Redis from 'ioredis';
import redisConfig from '@config/redis';
import { Log } from '@services/loggerService';

export const SOCKET_EVENTS_CHANNEL = 'socket:events';

/** Use a dedicated connection for publishing (avoids blocking the main redis client). */
let publisher: Redis | null = null;

function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(redisConfig);
    publisher.on('error', (err) => Log.error('Socket pub/sub publisher error', { err: err?.message }));
  }
  return publisher;
}

export type SocketEventPayload =
  | { type: 'new_message'; conversationId: string; message: any; receiverId?: number }
  | { type: 'new_message_both'; conversationId: string; message: any; userId1: number; userId2: number }
  | { type: 'conversation_status'; userId: number; conversationId: string; status: string }
  | { type: 'session_revoked'; userId: number; deviceId: number }
  | { type: 'session_revoked_many'; userId: number; deviceIds: number[] };

/**
 * Publish a socket event to Redis. Socket-server subscribes and emits to clients.
 */
export async function publishSocketEvent(payload: SocketEventPayload): Promise<void> {
  try {
    const client = getPublisher();
    await client.publish(SOCKET_EVENTS_CHANNEL, JSON.stringify(payload));
  } catch (err: any) {
    Log.error('publishSocketEvent failed', { err: err?.message || err, type: payload.type });
  }
}

/**
 * Create a Redis subscriber (for socket-server). Subscriber client cannot run other commands.
 */
export function createSocketEventsSubscriber(
  onMessage: (payload: SocketEventPayload) => void | Promise<void>
): Redis {
  const sub = new Redis(redisConfig);
  sub.subscribe(SOCKET_EVENTS_CHANNEL, (err) => {
    if (err) Log.error('Socket events subscribe error', { err: err?.message });
    else Log.info(`Subscribed to Redis channel: ${SOCKET_EVENTS_CHANNEL}`);
  });
  sub.on('message', (channel, message) => {
    if (channel !== SOCKET_EVENTS_CHANNEL) return;
    try {
      const payload = JSON.parse(message) as SocketEventPayload;
      Promise.resolve(onMessage(payload)).catch((e) =>
        Log.error('Socket event handler error', { err: (e as Error)?.message })
      );
    } catch (e) {
      Log.error('Invalid socket event payload', { raw: message });
    }
  });
  sub.on('error', (err) => Log.error('Socket events subscriber error', { err: err?.message }));
  return sub;
}
