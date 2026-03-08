import * as scheduledTermination from "./scheduledTermination";

export type ScheduledTaskDef = {
  /** Cron expression (e.g. "0 2 * * *" = daily at 2:00 AM) */
  schedule: string;
  /** Task name for logging */
  name: string;
  /** Laravel-style: the method that runs the task */
  handle: () => Promise<void>;
};

/** All scheduled tasks (define new tasks in this folder and add here). */
export const tasks: ScheduledTaskDef[] = [
  {
    name: scheduledTermination.name,
    schedule: scheduledTermination.schedule,
    handle: scheduledTermination.handle,
  },
];
