import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { ProposalService } from "../../module/proposal/ProposalService";
import { ProposalStatus } from "@constants/status";

/**
 * Auto-terminate contracts whose scheduled termination window (terminate_at) has passed.
 * The actual termination + activity/chat/notifications run through
 * ProposalService.finalizeExpiredTermination (guarded so it fires exactly once even if a
 * page read already triggered it).
 *
 * Runs every 15 minutes.
 */
export const name = "scheduled-contract-termination";
export const schedule = "*/15 * * * *";

export async function handle(): Promise<void> {
  const now = new Date();
  const due = await (prisma as any).proposal.findMany({
    where: {
      status: ProposalStatus.TERMINATING,
      terminate_at: { not: null, lte: now }
    },
    select: {
      id: true,
      unique_id: true,
      provider_id: true,
      terminate_by: true,
      project: { select: { id: true, user_id: true, project_title: true } }
    },
    take: 100
  });

  if (due.length === 0) return;

  let count = 0;
  for (const p of due) {
    if (p.project?.id == null || p.project?.user_id == null) continue;
    try {
      const applied = await ProposalService.finalizeExpiredTermination({
        id: p.id,
        unique_id: p.unique_id,
        provider_id: p.provider_id,
        terminate_by: p.terminate_by ?? null,
        project: {
          id: p.project.id,
          user_id: p.project.user_id,
          project_title: p.project.project_title ?? null
        }
      });
      if (applied) count += 1;
    } catch (err) {
      Log.error(`[scheduled-contract-termination] Failed for proposal ${p.id}`, { err });
    }
  }

  if (count > 0) {
    Log.info(`[scheduled-contract-termination] Terminated ${count} contract(s)`);
  }
}
