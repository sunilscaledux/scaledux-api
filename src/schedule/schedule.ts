import cron from "node-cron";
import { tasks } from "./init";

/**
 * Call once when the server starts (e.g. in server.ts after httpServer.listen).
 */
export function startSchedule(): void {
  for (const task of tasks) {
    cron.schedule(task.schedule, async () => {
      try {
        await task.handle();
      } catch (err) {
        console.error(`[${task.name}] Job error:`, err);
      }
    });
    console.log(`[schedule] Registered: ${task.name} (${task.schedule})`);
  }
}
