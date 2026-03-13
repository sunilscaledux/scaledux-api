import { Worker, Job } from 'bullmq';
import fs from 'fs';
import path from 'path';
import { JobMetadata, JobClass as JobClassType } from '../jobs/BaseJob';
import { mainQueue } from '../queues/Queue';
import { defaultWorkerConfig, redisConnection, mainQueueName } from '../config/queue';
import { Log } from '@services/loggerService';

// Auto-discover all job classes from src/jobs (or dist/jobs in production)
const jobMap = new Map<string, JobClassType<any>>();
const jobsDir = path.resolve(__dirname, '../jobs');
const ignoredFiles = new Set(['BaseJob', 'index', 'types']);

for (const fileName of fs.readdirSync(jobsDir)) {
  const match = fileName.match(/^(.+)\.(ts|js)$/i);
  if (!match) continue;

  const baseName = match[1];
  if (ignoredFiles.has(baseName)) continue;

  const modulePath = path.join(jobsDir, fileName);
  const moduleExports = require(modulePath) as Record<string, unknown>;

  for (const [exportName, jobExport] of Object.entries(moduleExports)) {
    if (typeof jobExport === 'function' && typeof (jobExport as any).prototype?.handle === 'function') {
      const key = `src/jobs/${exportName}`;
      jobMap.set(key, jobExport as unknown as JobClassType<any>);
    }
  }
}

for (const key of jobMap.keys()) {
  console.log(`[Worker] Registered job: ${key}`);
  Log.info(`Registered job: ${key}`);
}

function normalizeJobPath(rawPath: string): string {
  let normalized = (rawPath || '').trim().replace(/\\/g, '/');

  // If only class name was stored, convert to canonical path.
  if (!normalized.includes('/')) {
    normalized = `src/jobs/${normalized}`;
  }

  // Accept dist paths and convert to canonical src path.
  normalized = normalized.replace(/^dist\/jobs\//, 'src/jobs/');

  // Accept "jobs/Foo" format and convert to canonical path.
  normalized = normalized.replace(/^jobs\//, 'src/jobs/');

  // Remove optional file extension.
  normalized = normalized.replace(/\.(ts|js)$/i, '');

  // If path still contains "/jobs/", normalize by last segment.
  const jobsSegmentIndex = normalized.lastIndexOf('/jobs/');
  if (jobsSegmentIndex !== -1) {
    const className = normalized.slice(jobsSegmentIndex + '/jobs/'.length);
    normalized = `src/jobs/${className}`;
  }

  return normalized;
}

Log.info(`Worker Redis: ${redisConnection.host}:${redisConnection.port} db=${redisConnection.db}`);

const mainWorker = new Worker<JobMetadata>(
  mainQueueName,
  async (job: Job<JobMetadata>) => {
    const payload = (job.data as any)?.jobData ?? job.data;
    const jobPath = payload?.jobClass as string;
    const data = payload?.data;

    if (!jobPath) {
      throw new Error(
        `Invalid job payload for ${job.id}: missing jobClass (keys: ${Object.keys((job.data as any) || {}).join(', ')})`
      );
    }

    const normalizedJobPath = normalizeJobPath(jobPath);
    Log.info(`Processing job: ${jobPath} -> ${normalizedJobPath} (${job.id})`);
    Log.info(`Registered jobs: ${[...jobMap.keys()].join(', ')}`);

    const JobClass = jobMap.get(normalizedJobPath);
    if (!JobClass) {
      throw new Error(`No handler found for job class: ${jobPath} (normalized: ${normalizedJobPath}, registered: ${[...jobMap.keys()].join(', ')})`);
    }
    const handler = new JobClass();

    try {
      const result = await handler.handle(data);
      Log.info(`Job completed: ${normalizedJobPath} (${job.id})`);
      return result;
    } catch (error: any) {
      Log.error(`Job failed: ${normalizedJobPath} (${job.id})`, { message: error.message });
      
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

Log.info(`Main worker started (queue: ${mainQueueName})`);

mainQueue.getJobCounts().then((counts) => {
  Log.info('Queue status', { counts });
}).catch((err) => {
  Log.warn('Could not get queue counts (ensure API and worker use same Redis host/port/db)', { err });
});

export default mainWorker;
