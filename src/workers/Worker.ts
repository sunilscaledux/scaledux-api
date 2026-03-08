import { Worker, Job } from 'bullmq';
import { JobMetadata, getJobHandler, getRegisteredJobTypes, registerJobHandler } from '../jobs/BaseJob';
import { SendNotificationJob } from '../jobs/SendNotificationJob';
import { mainQueue } from '../queues/Queue';
import { defaultWorkerConfig } from '../config/queue';

// Explicit registration so handlers are always available
registerJobHandler(SendNotificationJob);


const mainWorker = new Worker<JobMetadata>(
  'main-queue',
  async (job: Job<JobMetadata>) => {
    const { jobClass, data } = job.data;
     
    console.log(`⚙️ Processing job: ${jobClass} (${job.id})`);

    // Get the handler instance by class name
    const handler = getJobHandler(jobClass);
    
    if (!handler) {
      throw new Error(`No handler found for job class: ${jobClass}`);
    }

    try {
      // Call the handle()
      const result = await handler.handle(data);
      console.log(`✅ Job completed: ${jobClass} (${job.id})`);
      return result;
    } catch (error: any) {
      console.error(`❌ Job failed: ${jobClass} (${job.id})`, error.message);
      
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
  console.log(`✅ Job ${job.id} completed successfully`);
});

mainWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

mainWorker.on('error', (error) => {
  console.error('❌ Worker error:', error);
});

mainWorker.on('active', (job) => {
  console.log(`⚙️ Job ${job.id} is now active`);
});

mainWorker.on('stalled', (jobId) => {
  console.log(`⚠️ Job ${jobId} has stalled`);
});

console.log('🚀 Main worker started and listening for jobs...');
console.log(`📋 Registered job types: ${getRegisteredJobTypes().join(', ')}`);

// Log queue status
mainQueue.getJobCounts().then((counts) => {
  console.log('📊 Queue status:', counts);
});

export default mainWorker;
