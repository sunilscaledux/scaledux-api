/**
 * Standalone worker process. Connects to Redis and processes BullMQ jobs.
 * Listens on port 8000 for health checks (e.g. GET /health => 200).
 * Run: npm run worker (dev) or npm run start:worker (prod).
 */
import './moduleAlias';
import dotenv from 'dotenv';
dotenv.config();

// Set worker log channel before logger is imported so it writes to storage/logs/worker-YYYY-MM-DD.log
process.env.LOG_CHANNEL = process.env.WORKER_LOG_CHANNEL || 'worker';

import http from 'http';
import { Log } from '@services/loggerService';

const WORKER_PORT = parseInt(process.env.WORKER_PORT || '8000', 10);

async function start() {
  Log.info('Worker process starting...');
  await import('./workers/Worker');

  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'worker' }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.listen(WORKER_PORT, () => {
    Log.info(`Worker listening on http://localhost:${WORKER_PORT} (health: /health)`);
  });
}

start();
