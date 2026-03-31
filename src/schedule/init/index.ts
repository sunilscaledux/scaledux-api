import * as scheduledTermination from "./scheduledTermination";
import * as processWithdrawals from "./processWithdrawals";
import * as verifyBankAccounts from "./verifyBankAccounts";

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
  {
    name: processWithdrawals.name,
    schedule: processWithdrawals.schedule,
    handle: processWithdrawals.handle,
  },
  {
    name: verifyBankAccounts.name,
    schedule: verifyBankAccounts.schedule,
    handle: verifyBankAccounts.handle,
  },
];
