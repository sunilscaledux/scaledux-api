import { Queue } from 'bullmq';
import defaultQueueConfig, { messageQueueName } from '../config/queue';
import { Log } from '@services/loggerService';

export interface SaveMessageJobData {
  conversationId: string;
  userId: number;
  content: string;
  attachmentUrls?: string[];
  replyTo?: { messageId: number; unique_id: string; content: string; senderName?: string };
}

export const messageQueue = new Queue<SaveMessageJobData>(messageQueueName, defaultQueueConfig);

const JOB_NAME = 'save_message';

/** Enqueue message save; the message worker will save to DB and publish to Redis (socket:events) for realtime. */
export async function addSaveMessageJob(
  data: SaveMessageJobData,
  options?: { jobId?: string }
) {
  const job = await messageQueue.add(JOB_NAME, data, {
    jobId: options?.jobId,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  });
  Log.info(`Message job queued: ${job.id} [queue=${messageQueueName}]`);
  return job;
}

export { JOB_NAME as saveMessageJobName };
