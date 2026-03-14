
import './moduleAlias';
import dotenv from 'dotenv';
dotenv.config();

process.env.LOG_CHANNEL = process.env.WORKER_LOG_CHANNEL || 'worker';

import { Log } from '@services/loggerService';

async function start() {
  Log.info('Worker process starting...');
  await import('./workers/Worker');
}

start();
