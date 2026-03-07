import { Queue } from 'bullmq';
import defaultQueueConfig from '../config/queue';
import { JobMetadata, JobClass } from '../jobs/BaseJob';

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
    jobClass: jobClass.name,  // Store class name (e.g., 'GenerateInvoiceJob')
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

    console.log(`✅ Job dispatched: ${jobClass.name} (${job.id})`);
    return job;
  } catch (error: any) {
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log(`ℹ️ Job already queued: ${jobClass.name} (${options?.jobId})`);
      return null;
    }
    console.error(`❌ Error dispatching job ${jobClass.name}:`, error);
    throw error;
  }
}
