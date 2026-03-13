import { BaseJob, Job } from './BaseJob';
import { Activity } from '../module/activity/ActivityModel';

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
    await Activity.create({
      subjectType: data.subjectType,
      subjectUniqueId: data.subjectUniqueId,
      type: data.type,
      payload: data.payload,
      createdByUserId: data.createdByUserId
    });
  }
}
