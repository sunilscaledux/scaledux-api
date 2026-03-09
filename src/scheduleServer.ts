/**
 * Standalone schedule (cron) process. Runs on its own port for health checks and isolation.
 * Start with: npm run start:schedule (SCHEDULE_PORT env, default 4002)
 */
import "./moduleAlias";

import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { connectMongo } from "@services/mongoService";
import { startSchedule } from "./schedule/schedule";

const SCHEDULE_PORT = Number(process.env.SCHEDULE_PORT) || 4002;

const server = http.createServer((req, res) => {
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "schedule" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

async function start() {
  try {
    await connectMongo();
  } catch (_) {
    // Continue without MongoDB
  }
  startSchedule();
  server.listen(SCHEDULE_PORT, () => {
    console.log(`[schedule] Cron server: http://localhost:${SCHEDULE_PORT} (health: /health)`);
  });
}

start();
