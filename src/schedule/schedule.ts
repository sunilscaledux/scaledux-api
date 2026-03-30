import cron from "node-cron";
import { Log } from "@services/loggerService";
import { tasks } from "./init";

export function startSchedule(): void {
  for (const task of tasks) {
    cron.schedule(task.schedule, () => {
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
