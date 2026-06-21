import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { approveDeliverable } from "../../module/proposal/DeliverableService";

/**
 * Auto-approve deliverables left in SUBMITTED state for 48 hours without the
 * founder approving or requesting changes. Approves on the founder's behalf,
 * which reuses approveDeliverable (activity + chat + DELIVERABLE_APPROVED notif)
 * and lets the normal invoice -> payment flow proceed.
 *
 * Runs every 15 minutes.
 */
export const name = "deliverable-auto-approve";
export const schedule = "*/15 * * * *";

const AUTO_APPROVE_HOURS = 48;

export async function handle(): Promise<void> {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - AUTO_APPROVE_HOURS);

  const due = await (prisma as any).deliverable.findMany({
    where: {
      status: "SUBMITTED",
      submitted_at: { not: null, lte: cutoff },
    },
    select: {
      unique_id: true,
      milestone: {
        select: { proposal: { select: { project: { select: { user_id: true } } } } },
      },
    },
    take: 50,
  });

  if (due.length === 0) return;

  let count = 0;
  for (const d of due) {
    const founderId = d.milestone?.proposal?.project?.user_id;
    if (founderId == null) continue;
    try {
      const result = await approveDeliverable(founderId, d.unique_id);
      if (result.success) {
        count += 1;
      } else {
        Log.error(`[deliverable-auto-approve] Failed for ${d.unique_id}: ${result.message}`);
      }
    } catch (err) {
      Log.error(`[deliverable-auto-approve] Error for ${d.unique_id}`, { err });
    }
  }

  if (count > 0) {
    Log.info(`[deliverable-auto-approve] Auto-approved ${count} deliverable(s)`);
  }
}
