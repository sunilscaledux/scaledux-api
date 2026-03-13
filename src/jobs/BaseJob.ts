import { Job as BullMQJob } from 'bullmq';
import { Log } from '@services/loggerService';

// Base interface for all job handlers (Laravel style)
export interface JobHandler<T = any> {
  // The handle method that contains the job logic (like Laravel)
  handle(data: T): Promise<void>;
  
  // Optional: Job failed handler
  failed?(error: Error, data: T): Promise<void>;
}

// Job class constructor type
export type JobClass<T = any> = new () => JobHandler<T>;

// Job metadata for queue processing (stores class name, not instance)
export interface JobMetadata<T = any> {
  jobClass: string;     // Class name (e.g., 'SendEmailJob')
  data: T;              // The actual job data
  jobId?: string;       // Optional unique job ID
  priority?: number;    // Job priority
  attempts?: number;    // Number of retry attempts
  delay?: number;       // Delay before processing
}

// Registry to store job handlers by class name
const jobHandlers = new Map<string, JobClass<any>>();

// Decorator for auto-registration (runs when class is imported)
export function Job() {
  return function <T extends JobClass<any>>(constructor: T) {
    jobHandlers.set(constructor.name, constructor);
    Log.info(`Registered job handler: ${constructor.name}`);
    return constructor;
  };
}

/** Explicitly register a job class (use in worker so handler is always registered). */
export function registerJobHandler(JobClass: JobClass<any>): void {
  jobHandlers.set(JobClass.name, JobClass);
}

// Get handler instance by class name
export function getJobHandler(className: string): JobHandler<any> | null {
  const HandlerClass = jobHandlers.get(className);
  if (!HandlerClass) {
    Log.error(`No handler registered for class: ${className}`);
    return null;
  }
  return new HandlerClass();
}

// Get all registered job class names
export function getRegisteredJobTypes(): string[] {
  return Array.from(jobHandlers.keys());
}

// Base abstract class for job handlers
export abstract class BaseJob<T = any> implements JobHandler<T> {
  // Abstract method that must be implemented by child classes
  abstract handle(data: T): Promise<void>;
  
  // Optional failed handler
  async failed(error: Error, data: T): Promise<void> {
    Log.error('Job failed', { message: error.message });
  }
}
