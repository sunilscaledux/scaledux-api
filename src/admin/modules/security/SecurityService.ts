import { Prisma } from '@prisma/client';
import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { paginated } from '@admin/utils/pagination';
import { userCard, userCardSelect } from '@admin/utils/format';

/**
 * Device / session anomaly detection.
 *
 * Signal source is the `scd_login_devices` table (one row per refresh-token
 * session). A "device fingerprint" is the (device_type | browser | os) combo;
 * distinct IPs are tracked separately. An account is flagged when >= minDevices
 * distinct fingerprints appear within any rolling `windowHours` span — i.e.
 * multiple devices linked to one account in a short time.
 */

const HOUR_MS = 60 * 60 * 1000;

type DeviceRow = {
  id: number;
  device_name: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  is_current: boolean;
  is_trusted: boolean;
  last_used_at: Date;
  expires_at: Date;
  created_at: Date;
  deleted_at: Date | null;
};

/** Stable fingerprint key for a device row. */
function fingerprint(d: DeviceRow): string {
  return [d.device_type, d.browser, d.os].map((x) => (x || '?').trim().toLowerCase()).join('|');
}

/**
 * Tightest cluster of distinct fingerprints within any `windowHours` span.
 * O(n^2) per user; n (devices per account) is small in practice.
 */
function tightestCluster(devices: DeviceRow[], windowHours: number) {
  const sorted = [...devices].sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  const span = windowHours * HOUR_MS;
  let best = { count: 0, ips: 0, startAt: null as Date | null, endAt: null as Date | null };

  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i].created_at.getTime();
    const prints = new Set<string>();
    const ips = new Set<string>();
    let endAt = sorted[i].created_at;
    for (let j = i; j < sorted.length; j++) {
      if (sorted[j].created_at.getTime() - start > span) break;
      prints.add(fingerprint(sorted[j]));
      if (sorted[j].ip_address) ips.add(sorted[j].ip_address as string);
      endAt = sorted[j].created_at;
    }
    if (prints.size > best.count) {
      best = { count: prints.size, ips: ips.size, startAt: sorted[i].created_at, endAt };
    }
  }
  return best;
}

export interface DeviceAnomalyParams {
  page: number;
  limit: number;
  skip: number;
  windowHours: number;
  minDevices: number;
  created?: { gte?: Date; lte?: Date };
  search?: string;
}

export class SecurityService {
  static async deviceAnomalies(p: DeviceAnomalyParams): Promise<ServiceResponse> {
    // Scan window: explicit date range if given, else the last 7 days.
    const scan: Prisma.DateTimeFilter =
      p.created && (p.created.gte || p.created.lte)
        ? p.created
        : { gte: new Date(Date.now() - 7 * 24 * HOUR_MS) };

    // 1) Narrow to accounts with at least `minDevices` sessions in the scan window.
    const groups = await prisma.loginDevice.groupBy({
      by: ['user_id'],
      where: { created_at: scan },
      _count: { _all: true },
      having: { user_id: { _count: { gte: p.minDevices } } },
    });
    if (groups.length === 0) {
      return { success: true, message: 'OK', data: paginated([], 0, p.page, p.limit) };
    }

    // 2) Pull those accounts' sessions and compute the tightest rolling cluster.
    const userIds = groups.map((g) => g.user_id);
    const rows = await prisma.loginDevice.findMany({
      where: { user_id: { in: userIds }, created_at: scan },
      orderBy: { created_at: 'asc' },
    });

    const byUser = new Map<number, DeviceRow[]>();
    for (const r of rows) {
      const list = byUser.get(r.user_id) || [];
      list.push(r as DeviceRow);
      byUser.set(r.user_id, list);
    }

    const flagged: Array<{
      userId: number;
      devicesInWindow: number;
      ipsInWindow: number;
      totalSessions: number;
      distinctFingerprints: number;
      distinctIps: number;
      windowStart: Date | null;
      windowEnd: Date | null;
      lastActivity: Date;
    }> = [];

    for (const [userId, list] of byUser) {
      const cluster = tightestCluster(list, p.windowHours);
      if (cluster.count < p.minDevices) continue;
      flagged.push({
        userId,
        devicesInWindow: cluster.count,
        ipsInWindow: cluster.ips,
        totalSessions: list.length,
        distinctFingerprints: new Set(list.map(fingerprint)).size,
        distinctIps: new Set(list.map((d) => d.ip_address).filter(Boolean)).size,
        windowStart: cluster.startAt,
        windowEnd: cluster.endAt,
        lastActivity: list.reduce((m, d) => (d.last_used_at > m ? d.last_used_at : m), list[0].last_used_at),
      });
    }

    // Most suspicious first.
    flagged.sort(
      (a, b) => b.devicesInWindow - a.devicesInWindow || b.lastActivity.getTime() - a.lastActivity.getTime()
    );

    // Optional name/email search — resolve matching accounts before paginating
    // so the total count stays consistent with the returned page.
    let flaggedForPage = flagged;
    if (p.search) {
      const matches = await prisma.user.findMany({
        where: {
          id: { in: flagged.map((f) => f.userId) },
          OR: [
            { first_name: { contains: p.search } },
            { last_name: { contains: p.search } },
            { email: { contains: p.search } },
          ],
        },
        select: { id: true },
      });
      const allowed = new Set(matches.map((m) => m.id));
      flaggedForPage = flagged.filter((f) => allowed.has(f.userId));
    }

    // 3) Hydrate user cards for the current page only.
    const total = flaggedForPage.length;
    const pageSlice = flaggedForPage.slice(p.skip, p.skip + p.limit);
    const users = await prisma.user.findMany({
      where: { id: { in: pageSlice.map((f) => f.userId) } },
      select: userCardSelect,
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const items = pageSlice.map((f) => ({
      user: userCard(userMap.get(f.userId)),
      devices_in_window: f.devicesInWindow,
      ips_in_window: f.ipsInWindow,
      total_sessions: f.totalSessions,
      distinct_fingerprints: f.distinctFingerprints,
      distinct_ips: f.distinctIps,
      window_start: f.windowStart,
      window_end: f.windowEnd,
      last_activity: f.lastActivity,
      severity: severityFor(f.devicesInWindow, f.distinctIps),
    }));

    return { success: true, message: 'OK', data: paginated(items, total, p.page, p.limit) };
  }

  /** Full device / session history for one account (by unique_id). */
  static async userDevices(uniqueId: string, windowHours: number): Promise<ServiceResponse> {
    const user = await prisma.user.findUnique({ where: { unique_id: uniqueId }, select: userCardSelect });
    if (!user) return { success: false, message: 'User not found', statusCode: 404 };

    const rows = (await prisma.loginDevice.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
    })) as DeviceRow[];

    const now = Date.now();
    const statusOf = (d: DeviceRow) => {
      if (d.deleted_at) return 'REVOKED';
      if (d.expires_at.getTime() < now) return 'EXPIRED';
      return 'ACTIVE';
    };

    const cluster = tightestCluster(rows, windowHours);
    const anomaly = cluster.count >= 3; // same default threshold as the list view

    const summary = {
      total_sessions: rows.length,
      active: rows.filter((d) => statusOf(d) === 'ACTIVE').length,
      revoked: rows.filter((d) => d.deleted_at).length,
      expired: rows.filter((d) => statusOf(d) === 'EXPIRED').length,
      distinct_fingerprints: new Set(rows.map(fingerprint)).size,
      distinct_ips: new Set(rows.map((d) => d.ip_address).filter(Boolean)).size,
      first_seen: rows.length ? rows[rows.length - 1].created_at : null,
      last_used: rows.length ? rows.reduce((m, d) => (d.last_used_at > m ? d.last_used_at : m), rows[0].last_used_at) : null,
      devices_in_window: cluster.count,
      ips_in_window: cluster.ips,
      window_start: cluster.startAt,
      window_end: cluster.endAt,
      window_hours: windowHours,
      is_anomaly: anomaly,
      severity: severityFor(cluster.count, new Set(rows.map((d) => d.ip_address).filter(Boolean)).size),
    };

    const devices = rows.map((d) => ({
      id: d.id,
      device_name: d.device_name,
      device_type: d.device_type,
      browser: d.browser,
      os: d.os,
      ip_address: d.ip_address,
      is_current: d.is_current,
      is_trusted: d.is_trusted,
      status: statusOf(d),
      last_used_at: d.last_used_at,
      created_at: d.created_at,
      expires_at: d.expires_at,
      deleted_at: d.deleted_at,
    }));

    return { success: true, message: 'OK', data: { user: userCard(user), summary, devices } };
  }
}

/** Coarse severity bucket from cluster size + IP spread. */
function severityFor(devicesInWindow: number, distinctIps: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (devicesInWindow >= 5 || distinctIps >= 5) return 'HIGH';
  if (devicesInWindow >= 3 || distinctIps >= 3) return 'MEDIUM';
  return 'LOW';
}
