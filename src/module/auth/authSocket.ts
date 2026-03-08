import axios from "axios";
import socketConfig from "@config/socketConfig";

/**
 * Notify socket server to emit session_revoked to a device (so it can logout immediately).
 */
export async function emitSessionRevoked(userId: number, deviceId: number): Promise<void> {
  try {
    await axios.post(
      `${socketConfig.serverUrl}/emit`,
      { type: "session_revoked", userId, deviceId },
      {
        headers: { "x-internal-secret": socketConfig.emitSecret },
        timeout: 5000,
      }
    );
  } catch (err: any) {
    console.error("Socket emit session_revoked failed:", err?.message || err);
  }
}

/**
 * Notify socket server to emit session_revoked to multiple devices.
 */
export async function emitSessionRevokedMany(userId: number, deviceIds: number[]): Promise<void> {
  if (deviceIds.length === 0) return;
  try {
    await axios.post(
      `${socketConfig.serverUrl}/emit`,
      { type: "session_revoked_many", userId, deviceIds },
      {
        headers: { "x-internal-secret": socketConfig.emitSecret },
        timeout: 5000,
      }
    );
  } catch (err: any) {
    console.error("Socket emit session_revoked_many failed:", err?.message || err);
  }
}
