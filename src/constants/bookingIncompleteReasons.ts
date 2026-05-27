/**
 * Reasons a mentor can pick when marking a booking as not completed successfully.
 * Used when the mentor submits the "Mark complete" flow with success=false.
 * Stored in Booking.completion_reason; validated on submit.
 */



export const BOOKING_INCOMPLETE_REASONS = [
  'Founder did not join',
  'Mentor was unable to join',
  'Technical issues during the call',
  'Call ended early by mutual agreement',
  'Other'
] as const;

export type BookingIncompleteReason = (typeof BOOKING_INCOMPLETE_REASONS)[number];

export function isValidBookingIncompleteReason(value: string | null | undefined): boolean {
  if (value == null || value === '') return false;
  return (BOOKING_INCOMPLETE_REASONS as readonly string[]).includes(value);
}
