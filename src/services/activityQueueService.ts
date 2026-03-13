import { dispatch } from '../queues/Queue';
import { ActivityJob } from '../jobs/ActivityJob';
import { Log } from '@services/loggerService';
import type { ActivityJobData } from '../jobs/ActivityJob';

/**
 * Queue an activity to be stored in MongoDB by the worker.
 * Use this instead of writing activity in real time so the API stays fast and we can add more activity types in one place.
 */
export async function queueActivity(
  subjectType: string,
  subjectUniqueId: string,
  type: string,
  payload: Record<string, unknown>,
  createdByUserId: number
): Promise<void> {
  const data: ActivityJobData = {
    subjectType,
    subjectUniqueId,
    type,
    payload,
    createdByUserId
  };
  try {
    await dispatch(ActivityJob, data, { jobId: undefined });
  } catch (err) {
    Log.error('activityQueueService.queueActivity failed', { err });
    throw err;
  }
}
