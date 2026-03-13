import { Queue } from 'bullmq';
import defaultQueueConfig, { mainQueueName } from '../config/queue';
import { JobMetadata, JobClass, getJobName } from '../jobs/BaseJob';
import { Log } from '@services/loggerService';

export const mainQueue = new Queue<JobMetadata>(mainQueueName, defaultQueueConfig);

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
  const jobPath = getJobName(jobClass);
  const jobMetadata: JobMetadata = {
    jobClass: jobPath,
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
    Log.info(`Job dispatched: ${jobPath} (${job.id}) [queue=${mainQueueName}]`);
    return job;
  } catch (error: any) {
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      Log.info(`Job already queued: ${jobPath} (${options?.jobId})`);
      return null;
    }
    Log.error(`Error dispatching job ${jobPath}`, { error });
    throw error;
  }
}
