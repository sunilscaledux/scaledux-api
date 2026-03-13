import { BaseJob, Job } from './BaseJob';
import { prisma } from '../services/prismaService';

export interface ActivityJobData {
  /** e.g. 'Proposal', 'FounderProject' */
  subjectType: string;
  /** Unique id of the subject (e.g. proposal.unique_id, project.unique_id) */
  subjectUniqueId: string;
  /** Activity type: STATUS_CHANGE, REQUEST_MODIFY, MILESTONE_PAYMENT, etc. */
  type: string;
  /** Arbitrary payload (reason, message, amounts, etc.) */
  payload: Record<string, unknown>;
  createdByUserId: number;
}

@Job()
export class ActivityJob extends BaseJob<ActivityJobData> {
  async handle(data: ActivityJobData): Promise<void> {
    await prisma.activity.create({
      data: {
        subject_type: data.subjectType,
        subject_unique_id: data.subjectUniqueId,
        type: data.type,
        payload: data.payload as object,
        created_by_user_id: data.createdByUserId
      }
    });
  }
}
