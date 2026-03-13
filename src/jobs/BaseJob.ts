import { Log } from '@services/loggerService';

export interface JobHandler<T = any> {
  handle(data: T): Promise<void>;
  failed?(error: Error, data: T): Promise<void>;
}

export type JobClass<T = any> = new () => JobHandler<T>;

export interface JobMetadata<T = any> {
  jobClass: string;
  data: T;
  jobId?: string;
  priority?: number;
  attempts?: number;
  delay?: number;
}

/** Build job path from class name: src/jobs/ClassName */
export function getJobName(jobClass: JobClass<any>): string {
  const name = (jobClass as { name?: string }).name;
  return name ? `src/jobs/${name}` : 'src/jobs/UnknownJob';
}

export abstract class BaseJob<T = any> implements JobHandler<T> {
  abstract handle(data: T): Promise<void>;

  async failed(error: Error, data: T): Promise<void> {
    Log.error('Job failed', { message: error.message });
  }
}
