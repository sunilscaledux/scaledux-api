import { publishSocketEvent } from "@services/socketPubSub";

/**
 * Notify socket server via Redis Pub/Sub to emit session_revoked to a device.
 */
export async function emitSessionRevoked(userId: number, deviceId: number): Promise<void> {
  await publishSocketEvent({ type: "session_revoked", userId, deviceId });
}

/**
 * Notify socket server via Redis Pub/Sub to emit session_revoked to multiple devices.
 */
export async function emitSessionRevokedMany(userId: number, deviceIds: number[]): Promise<void> {
  if (deviceIds.length === 0) return;
  await publishSocketEvent({ type: "session_revoked_many", userId, deviceIds });
}
