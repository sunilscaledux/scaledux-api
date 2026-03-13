import { Worker, Job } from 'bullmq';
import { JobMetadata, JobClass as JobClassType } from '../jobs/BaseJob';
import { NotificationJob, NotificationEmailJob, ActivityJob } from '../jobs';
import { mainQueue } from '../queues/Queue';
import { defaultWorkerConfig, redisConnection } from '../config/queue';
import { Log } from '@services/loggerService';

// Explicit Laravel-style path => handler map (stable in prod builds)
const jobMap = new Map<string, JobClassType<any>>([
  ['src/jobs/NotificationJob', NotificationJob],
  ['src/jobs/NotificationEmailJob', NotificationEmailJob],
  ['src/jobs/ActivityJob', ActivityJob],
]);

for (const key of jobMap.keys()) {
  console.log(`[Worker] Registered job: ${key}`);
  Log.info(`Registered job: ${key}`);
}

Log.info(`Worker Redis: ${redisConnection.host}:${redisConnection.port} db=${redisConnection.db}`);

const mainWorker = new Worker<JobMetadata>(
  'main-queue',
  async (job: Job<JobMetadata>) => {
    const { jobClass: jobPath, data } = job.data;
    Log.info(`Processing job: ${jobPath} (${job.id})`);

    const JobClass = jobMap.get(jobPath);
    if (!JobClass) {
      throw new Error(`No handler found for job class: ${jobPath} (registered: ${[...jobMap.keys()].join(', ')})`);
    }
    const handler = new JobClass();

    try {
      const result = await handler.handle(data);
      Log.info(`Job completed: ${jobPath} (${job.id})`);
      return result;
    } catch (error: any) {
      Log.error(`Job failed: ${jobPath} (${job.id})`, { message: error.message });
      
      // Call the failed() method if it exists
      if (handler.failed) {
        await handler.failed(error, data);
      }
      
      throw error;
    }
  },
  defaultWorkerConfig
);

// Event listeners
mainWorker.on('completed', (job) => {
  Log.info(`Job ${job.id} completed successfully`);
});

mainWorker.on('failed', (job, err) => {
  Log.error(`Job ${job?.id} failed`, { message: err?.message });
});

mainWorker.on('error', (error) => {
  Log.error('Worker error', { error });
});

mainWorker.on('active', (job) => {
  Log.info(`Job ${job.id} is now active`);
});

mainWorker.on('stalled', (jobId) => {
  Log.warn(`Job ${jobId} has stalled`);
});

// When BullMQ connects to Redis it may warn: "Eviction policy is volatile-lru. It should be noeviction".
// If jobs (e.g. notifications) are not processed, set Redis maxmemory-policy to noeviction so job keys are not evicted.
mainWorker.on('ready', () => {
  Log.info(`Main worker connected to Redis | registered: ${[...jobMap.keys()].join(', ')}`);
});

Log.info('Main worker started (queue: main-queue)');

mainQueue.getJobCounts().then((counts) => {
  Log.info('Queue status', { counts });
}).catch((err) => {
  Log.warn('Could not get queue counts (ensure API and worker use same Redis host/port/db)', { err });
});

export default mainWorker;
