import { Activity } from '@module/activity/ActivityModel';
import { queueActivity } from '@services/activityQueueService';
import { mongoConnected } from '@services/mongoService';
import type { ProposalActivityType, IProposalActivityPayload } from './ProposalActivityModel';

/** Subject type for proposal activities in the generic activity store */
const PROPOSAL_SUBJECT_TYPE = 'Proposal';

/**
 * Queue proposal activity to be stored in MongoDB by the worker (non-blocking).
 * Replaces real-time createProposalActivity so we use the generic ActivityJob.
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
 * Get proposal activities from the generic activity store (subjectType = Proposal).
 * Returns same shape as before for backward compatibility.
 */
export async function getProposalActivities(proposalUniqueId: string): Promise<Array<{
  proposalUniqueId: string;
  type: string;
  payload: Record<string, unknown>;
  createdByUserId: number;
  createdAt: Date;
}>> {
  if (!mongoConnected()) return [];
  const list = await Activity.find({
    subjectType: PROPOSAL_SUBJECT_TYPE,
    subjectUniqueId: proposalUniqueId
  })
    .sort({ createdAt: -1 })
    .lean();
  return list.map((doc: any) => ({
    proposalUniqueId: doc.subjectUniqueId,
    type: doc.type,
    payload: doc.payload,
    createdByUserId: doc.createdByUserId,
    createdAt: doc.createdAt
  }));
}
