export const MEETING_REASONS = {
  CANCEL: [
    'Schedule conflict',
    'No longer needed',
    'Found alternative mentor',
    'Personal emergency',
    'Other',
  ],
  RESCHEDULE: [
    'Schedule conflict',
    'Need more preparation time',
    'Timezone mismatch',
    'Personal emergency',
    'Other',
  ],
  REJECT: [
    'Founder did not join',
    'Mentor was unable to join',
    'Technical issues during the call',
    'Call ended early by mutual agreement',
    'Other',
  ],
} as const;

export type MeetingAction = keyof typeof MEETING_REASONS;
export type MeetingReason<T extends MeetingAction> = (typeof MEETING_REASONS)[T][number];

export function isValidMeetingReason(action: MeetingAction, value: string | null | undefined): boolean {
  if (value == null || value === '') return false;
  return (MEETING_REASONS[action] as readonly string[]).includes(value);
}
