import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";
import { PersonalInfoService } from "./ProfileService";

const DEACTIVATION_GRACE_DAYS = Number(process.env.DEACTIVATION_GRACE_DAYS) || 7;

export interface DeactivationStatus {
  isDeactivated: boolean;
  scheduledAt: string | null;
  cancelledAt: string | null;
  /** Human-readable countdown e.g. "2 days 3 hours" until deletion */
  deleteAfter: string | null;
}

function formatCountdown(until: Date): string {
  const now = new Date();
  const ms = until.getTime() - now.getTime();
  if (ms <= 0) return "0 days 0 hours";
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  return parts.join(" ");
}

/**
 * Confirm deactivation with password: set is_deactivated and schedule deletion, then caller logs out.
 */
export async function confirmDeactivateWithPassword(
  userId: number,
  password: string,
  reason?: string
): Promise<ServiceResponse> {
  const verify = await PersonalInfoService.verifyPassword(userId, password);
  if (!verify.success) return verify;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, is_deactivated: true },
  });
  if (!user) return { success: false, message: "User not found." };
  if ((user as { is_deactivated?: boolean }).is_deactivated) {
    return { success: false, message: "Account is already deactivated." };
  }

  const scheduledAt = new Date();
  scheduledAt.setDate(scheduledAt.getDate() + DEACTIVATION_GRACE_DAYS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { is_deactivated: true },
    }),
    prisma.scheduleTermination.upsert({
      where: { user_id: userId },
      create: { user_id: userId, scheduled_at: scheduledAt, action: 'deactivate', reason: reason || null },
      update: { scheduled_at: scheduledAt, cancelled_at: null, action: 'deactivate', reason: reason || null },
    }),
  ]);

  return {
    success: true,
    message: "Account deactivated. You have been logged out.",
    data: { scheduledAt: scheduledAt.toISOString() },
  };
}

/**
 * Schedule account deletion with password (no deactivation, no logout). User can revoke until the date.
 */
export async function scheduleDeleteWithPassword(
  userId: number,
  password: string,
  reason?: string
): Promise<ServiceResponse> {
  const verify = await PersonalInfoService.verifyPassword(userId, password);
  if (!verify.success) return verify;

  const scheduledAt = new Date();
  scheduledAt.setDate(scheduledAt.getDate() + DEACTIVATION_GRACE_DAYS);

  await prisma.scheduleTermination.upsert({
    where: { user_id: userId },
    create: { user_id: userId, scheduled_at: scheduledAt, action: 'delete', reason: reason || null },
    update: { scheduled_at: scheduledAt, cancelled_at: null, action: 'delete', reason: reason || null },
  });

  return {
    success: true,
    message: "Account deletion scheduled. You can cancel this in settings until the date.",
    data: { scheduledAt: scheduledAt.toISOString() },
  };
}

/**
 * Get deactivation status and countdown for the current user
 */
export async function getDeactivationStatus(userId: number): Promise<ServiceResponse & { data?: DeactivationStatus }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { is_deactivated: true },
  });
  if (!user) return { success: false, message: "User not found." };

  const schedule = await prisma.scheduleTermination.findUnique({
    where: { user_id: userId },
  });

  const scheduledAt = schedule?.scheduled_at ?? null;
  const cancelledAt = schedule?.cancelled_at ?? null;
  const activeSchedule = scheduledAt && !cancelledAt;

  let deleteAfter: string | null = null;
  if (activeSchedule) {
    deleteAfter = formatCountdown(scheduledAt);
  }

  return {
    success: true,
    message: "OK",
    data: {
      isDeactivated: user.is_deactivated,
      scheduledAt: scheduledAt?.toISOString() ?? null,
      cancelledAt: cancelledAt?.toISOString() ?? null,
      deleteAfter,
    },
  };
}

/**
 * Cancel deactivation: set is_deactivated = false and cancel schedule (set cancelled_at).
 * Used when user explicitly clicks "Cancel deactivation" in settings.
 */
export async function cancelDeactivation(userId: number): Promise<ServiceResponse> {
  const schedule = await prisma.scheduleTermination.findUnique({
    where: { user_id: userId },
  });
  if (!schedule || schedule.cancelled_at) {
    return { success: false, message: "No active deactivation schedule to cancel." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { is_deactivated: false },
    }),
    prisma.scheduleTermination.update({
      where: { user_id: userId },
      data: { cancelled_at: new Date() },
    }),
  ]);

  return { success: true, message: "Account reactivated. Deactivation has been cancelled." };
}

/**
 * Auto-reactivate on login: if user is deactivated, set is_deactivated = false and cancel any
 * scheduled termination so they don't have to do it in settings. Called from login and refresh.
 */
export async function reactivateOnLogin(userId: number): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { is_deactivated: true },
  });
  if (!user?.is_deactivated) return;

  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { is_deactivated: false },
    }),
    // Always cancel any schedule for this user on reactivation (updateMany is no-op if no row)
    prisma.scheduleTermination.updateMany({
      where: { user_id: userId },
      data: { cancelled_at: now },
    }),
  ]);
}
