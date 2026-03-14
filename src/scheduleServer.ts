/**
 * Standalone schedule (cron) process. Cron jobs run automatically via startSchedule().
 * Start with: npm run start:schedule or npm run dev:schedule
 */
import "./moduleAlias";

import dotenv from "dotenv";
dotenv.config();

import { Log } from "@services/loggerService";
import { startSchedule } from "./schedule/schedule";

function start() {
  Log.info("[schedule] Cron process starting...");
  startSchedule();
}

start();
