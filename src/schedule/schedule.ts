import cron from "node-cron";
import { Log } from "@services/loggerService";
import { tasks } from "./init";

/**
 * Call once when the server starts (e.g. in server.ts after httpServer.listen).
 */
export function startSchedule(): void {
  for (const task of tasks) {
    cron.schedule(task.schedule, () => {
      // Run in setImmediate so the cron callback returns immediately and doesn't block
      // the next scheduled tick (avoids "missed execution" when a task runs long).
      setImmediate(async () => {
        try {
          await task.handle();
        } catch (err) {
          Log.error(`[${task.name}] Job error`, { err });
        }
      });
    });
    Log.info(`[schedule] Registered: ${task.name} (${task.schedule})`);
  }
}
