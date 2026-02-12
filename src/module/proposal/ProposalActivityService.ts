import { ProposalActivity, IProposalActivity, ProposalActivityType, IProposalActivityPayload } from './ProposalActivityModel';
import { mongoConnected } from '@services/mongoService';

export async function createProposalActivity(
  proposalUniqueId: string,
  type: ProposalActivityType,
  payload: IProposalActivityPayload,
  createdByUserId: number
): Promise<void> {
  if (!mongoConnected()) return;
  try {
    await ProposalActivity.create({
      proposalUniqueId,
      type,
      payload,
      createdByUserId
    });
  } catch (error) {
    console.error('ProposalActivity create error:', error);
  }
}

export async function getProposalActivities(proposalUniqueId: string): Promise<IProposalActivity[]> {
  if (!mongoConnected()) return [];
  const list = await ProposalActivity.find({ proposalUniqueId })
    .sort({ createdAt: -1 })
    .lean();
  return list as unknown as IProposalActivity[];
}
