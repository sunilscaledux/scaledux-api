import { Worker, Job } from 'bullmq';
import fs from 'fs';
import path from 'path';
import { JobMetadata, JobClass as JobClassType } from '../jobs/BaseJob';
import { defaultWorkerConfig, mainQueueName } from '../config/queue';
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
    const JobClass = jobMap.get(normalizedJobPath);
    if (!JobClass) {
      throw new Error(`No handler found for job class: ${jobPath} (normalized: ${normalizedJobPath}, registered: ${[...jobMap.keys()].join(', ')})`);
    }
    const handler = new JobClass();

    try {
      const result = await handler.handle(data);
      return result;
    } catch (error: any) {
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
  const payload = (job.data as any)?.jobData ?? job.data;
  const jobPath = payload?.jobClass ?? 'UnknownJob';
  Log.info(`Job completed: ${jobPath} (${job.id})`);
});

mainWorker.on('failed', (job, err) => {
  const payload = (job?.data as any)?.jobData ?? job?.data;
  const jobPath = payload?.jobClass ?? 'UnknownJob';
  Log.error(`Job failed: ${jobPath} (${job?.id})`, { message: err?.message });
});

export default mainWorker;
