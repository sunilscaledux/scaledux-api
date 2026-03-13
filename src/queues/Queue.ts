import { Queue } from 'bullmq';
import defaultQueueConfig from '../config/queue';
import { JobMetadata, JobClass } from '../jobs/BaseJob';
import { Log } from '@services/loggerService';

// Main queue for all job types
export const mainQueue = new Queue<JobMetadata>('main-queue', defaultQueueConfig);

// Dispatch a job to the queue 
export async function dispatch<T = any>(
  jobClass: JobClass<T>,
  data: T,
  options?: {
    jobId?: string;
    priority?: number;
    delay?: number;
    attempts?: number;
  }
) {
  const jobMetadata: JobMetadata = {
    jobClass: jobClass.name,  // Store class name (e.g., 'SendEmailJob')
    data,
    jobId: options?.jobId,
    priority: options?.priority,
    attempts: options?.attempts,
  };

  try {
    const job = await mainQueue.add(
      'process-job',
      jobMetadata,
      {
        jobId: options?.jobId,
        priority: options?.priority || 1,
        delay: options?.delay,
        attempts: options?.attempts || 3,
      }
    );

    Log.info(`Job dispatched: ${jobClass.name} (${job.id})`);
    return job;
  } catch (error: any) {
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      Log.info(`Job already queued: ${jobClass.name} (${options?.jobId})`);
      return null;
    }
    Log.error(`Error dispatching job ${jobClass.name}`, { error });
    throw error;
  }
}
