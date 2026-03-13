import { Worker, Job } from 'bullmq';
import { JobMetadata, getJobHandler, getRegisteredJobTypes, registerJobHandler } from '../jobs/BaseJob';
import { CreateNotificationJob } from '../jobs/NotificationJob';
import { SendNotificationEmailJob } from '../jobs/EmailNotificationJob';
import { ActivityJob } from '../jobs/ActivityJob';
import { mainQueue } from '../queues/Queue';
import { defaultWorkerConfig } from '../config/queue';
import { Log } from '@services/loggerService';

// Explicit registration so handlers are always available
registerJobHandler(CreateNotificationJob);
registerJobHandler(SendNotificationEmailJob);
registerJobHandler(ActivityJob);


const mainWorker = new Worker<JobMetadata>(
  'main-queue',
  async (job: Job<JobMetadata>) => {
    const { jobClass, data } = job.data;
     
    Log.info(`Processing job: ${jobClass} (${job.id})`);

    // Get the handler instance by class name
    const handler = getJobHandler(jobClass);
    
    if (!handler) {
      throw new Error(`No handler found for job class: ${jobClass}`);
    }

    try {
      // Call the handle()
      const result = await handler.handle(data);
      Log.info(`Job completed: ${jobClass} (${job.id})`);
      return result;
    } catch (error: any) {
      Log.error(`Job failed: ${jobClass} (${job.id})`, { message: error.message });
      
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

Log.info('Main worker started and listening for jobs');
Log.info(`Registered job types: ${getRegisteredJobTypes().join(', ')}`);

mainQueue.getJobCounts().then((counts) => {
  Log.info('Queue status', { counts });
});

export default mainWorker;
