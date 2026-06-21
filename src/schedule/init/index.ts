import * as scheduledTermination from "./scheduledTermination";
import * as processWithdrawals from "./processWithdrawals";
import * as bookingCompletionReminder from "./bookingCompletionReminder";
import * as meetingLinkReminder from "./meetingLinkReminder";
import * as rescheduleAutoCancel from "./rescheduleAutoCancel";
import * as offerAutoExpiry from "./offerAutoExpiry";
import * as invoiceAutoApprove from "./invoiceAutoApprove";
import * as scheduledContractTermination from "./scheduledContractTermination";
import * as deliverableAutoApprove from "./deliverableAutoApprove";


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
    name: bookingCompletionReminder.name,
    schedule: bookingCompletionReminder.schedule,
    handle: bookingCompletionReminder.handle,
  },
  {
    name: meetingLinkReminder.name,
    schedule: meetingLinkReminder.schedule,
    handle: meetingLinkReminder.handle,
  },
  {
    name: rescheduleAutoCancel.name,
    schedule: rescheduleAutoCancel.schedule,
    handle: rescheduleAutoCancel.handle,
  },
  {
    name: offerAutoExpiry.name,
    schedule: offerAutoExpiry.schedule,
    handle: offerAutoExpiry.handle,
  },
  {
    name: invoiceAutoApprove.name,
    schedule: invoiceAutoApprove.schedule,
    handle: invoiceAutoApprove.handle,
  },
  {
    name: scheduledContractTermination.name,
    schedule: scheduledContractTermination.schedule,
    handle: scheduledContractTermination.handle,
  },
  {
    name: deliverableAutoApprove.name,
    schedule: deliverableAutoApprove.schedule,
    handle: deliverableAutoApprove.handle,
  },
];
