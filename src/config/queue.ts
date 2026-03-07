import { QueueOptions, WorkerOptions } from 'bullmq';
import redisConfig from './redis';

// BullMQ connection configuration
export const redisConnection = { 
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  db: redisConfig.db
};

// Default queue configuration for BullMQ
export const  defaultQueueConfig: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000 // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 86400*30 // Keep failed jobs for 24 hours
    }
  }
};

// Default worker configuration for BullMQ
export const defaultWorkerConfig: WorkerOptions = {
  connection: redisConnection,
  concurrency: 5,
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 }
};

export default defaultQueueConfig;
