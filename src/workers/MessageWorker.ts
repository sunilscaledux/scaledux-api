/**
 * Worker for messagequeuedev: saves chat messages to DB and publishes to Redis for realtime.
 * Run separately: npx ts-node src/workers/MessageWorker.ts (or via npm script).
 */
import '../moduleAlias';
import dotenv from 'dotenv';
dotenv.config();

import { Worker, Job } from 'bullmq';
import { messageQueueName, defaultWorkerConfig } from '../config/queue';
import { Log } from '../services/loggerService';
import { SaveMessageJob } from '../jobs/SaveMessageJob';
import type { SaveMessageJobData } from '../queues/MessageQueue';

const processor = async (job: Job<SaveMessageJobData>) => {
  const handler = new SaveMessageJob();
  await handler.handle(job.data);
};

const messageWorker = new Worker<SaveMessageJobData>(
  messageQueueName,
  processor,
  { ...defaultWorkerConfig, concurrency: 5 }
);

messageWorker.on('completed', (job) => {
  Log.info(`Message job completed: ${job.id} [queue=${messageQueueName}]`);
});

messageWorker.on('failed', (job, err) => {
  Log.error(`Message job failed: ${job?.id}`, { message: err?.message });
});

Log.info(`Message worker started, queue=${messageQueueName}`);

export default messageWorker;
