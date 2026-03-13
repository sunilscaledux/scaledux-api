import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";

/**
 * Delete all users whose schedule_termination has scheduled_at <= now and cancelled_at is null.
 * Deleting the user cascades to most related data; some relations use SetNull.
 */
export const name = "scheduled-termination";
export const schedule = "0 2 * * *"; // Daily at 2:00 AM

export async function handle(): Promise<void> {
  const now = new Date();
  const due = await prisma.scheduleTermination.findMany({
    where: {
      scheduled_at: { lte: now },
      cancelled_at: null,
    },
    select: { user_id: true },
  });
  for (const { user_id } of due) {
    try {
      await prisma.user.delete({ where: { id: user_id } });
      Log.info(`[scheduled-termination] Deleted user ${user_id}`);
    } catch (err) {
      Log.error(`[scheduled-termination] Failed to delete user ${user_id}`, { err });
    }
  }
}
