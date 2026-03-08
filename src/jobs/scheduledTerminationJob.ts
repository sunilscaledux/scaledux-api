import cron from "node-cron";
import { prisma } from "@services/prismaService";

/**
 * Run daily at 2:00 AM: delete all users whose schedule_termination
 * has scheduled_at <= now and cancelled_at is null.
 * Deleting the user cascades to most related data; some relations use SetNull.
 */
export function startScheduledTerminationCron() {
  cron.schedule("0 2 * * *", async () => {
    try {
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
          console.log(`[scheduled-termination] Deleted user ${user_id}`);
        } catch (err) {
          console.error(`[scheduled-termination] Failed to delete user ${user_id}:`, err);
        }
      }
    } catch (err) {
      console.error("[scheduled-termination] Job error:", err);
    }
  });
  console.log("[scheduled-termination] Cron scheduled (daily at 2:00 AM)");
}
