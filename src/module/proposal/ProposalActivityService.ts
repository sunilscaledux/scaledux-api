import { prisma } from '@services/prismaService';
import { queueActivity } from   '@queues/init/activityQueue';
import type { ProposalActivityType, IProposalActivityPayload } from './ProposalActivityModel';

const PROPOSAL_SUBJECT_TYPE = 'Proposal';

/**
 * Queue proposal activity to be stored in Postgres by the worker (ActivityJob).
 */
export async function createProposalActivity(
  proposalUniqueId: string,
  type: ProposalActivityType,
  payload: IProposalActivityPayload,
  createdByUserId: number
): Promise<void> {
  await queueActivity(
    PROPOSAL_SUBJECT_TYPE,
    proposalUniqueId,
    type,
    payload as Record<string, unknown>,
    createdByUserId
  );
}

/**
 * Get proposal activities from Postgres (Activity table, subject_type = Proposal).
 */
export async function getProposalActivities(proposalUniqueId: string): Promise<Array<{
  id: number;
  proposalUniqueId: string;
  type: string;
  payload: Record<string, unknown>;
  createdByUserId: number;
  createdAt: Date;
}>> {
  const list = await prisma.activity.findMany({
    where: {
      subject_type: PROPOSAL_SUBJECT_TYPE,
      subject_unique_id: proposalUniqueId
    },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      subject_unique_id: true,
      type: true,
      payload: true,
      created_by_user_id: true,
      created_at: true
    }
  });
  return list.map((row) => ({
    id: row.id,
    proposalUniqueId: row.subject_unique_id,
    type: row.type,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at
  }));
}
