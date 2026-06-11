

export const NOTIFICATION_EMAIL_TYPES = [
  // Proposals & Project Management
  { type: 'PROJECT_INVITATION', label: 'Project invitation received', category: 'Proposals & Project Management' },
  { type: 'INVITATION_ACCEPTED', label: 'An invitation is accepted', category: 'Proposals & Project Management' },
  { type: 'INVITATION_REJECTED', label: 'An invitation is rejected', category: 'Proposals & Project Management' },
  { type: 'PROPOSAL_RECEIVED', label: 'A proposal is received', category: 'Proposals & Project Management' },
  { type: 'PROPOSAL_ACCEPTED', label: 'A proposal is accepted', category: 'Proposals & Project Management' },
  { type: 'PROPOSAL_REJECTED', label: 'A proposal is rejected', category: 'Proposals & Project Management' },
  { type: 'JOB_APPLIED_CANCELLED_OR_CLOSED', label: 'A job I applied to has been cancelled or closed', category: 'Proposals & Project Management' },
  { type: 'PROPOSAL_WITHDRAWN', label: 'A proposal is withdrawn', category: 'Proposals & Project Management' },
  { type: 'PROPOSAL_CHANGE_REQUESTED', label: 'Changes requested on a proposal', category: 'Proposals & Project Management' },
  { type: 'OFFER_SENT', label: 'Offer sent', category: 'Proposals & Project Management' },
  { type: 'DELIVERABLE_SUBMITTED', label: 'Deliverable submitted', category: 'Proposals & Project Management' },
  { type: 'DELIVERABLE_APPROVED', label: 'Deliverable approved', category: 'Proposals & Project Management' },
  { type: 'PAYMENT_RELEASED', label: 'Payment released', category: 'Proposals & Project Management' },
  // 1:1 Call Bookings
  { type: 'BOOKING_REQUESTED', label: 'A new booking request is received', category: '1:1 Call Bookings' },
  { type: 'BOOKING_CONFIRMED', label: 'A booking is confirmed after payment', category: '1:1 Call Bookings' },
  { type: 'BOOKING_CANCELLED', label: 'A booking is cancelled', category: '1:1 Call Bookings' },
  { type: 'BOOKING_RESCHEDULE_REQUESTED', label: 'A mentor requests to reschedule a booking', category: '1:1 Call Bookings' },
  { type: 'MEETING_LINK_ADDED', label: 'A meeting link is added or updated', category: '1:1 Call Bookings' },
  { type: 'BOOKING_COMPLETED', label: 'A booking is marked complete by the mentor', category: '1:1 Call Bookings' },
  { type: 'BOOKING_RATE_PROMPT', label: 'A completed booking is ready to review', category: '1:1 Call Bookings' },
  { type: 'BOOKING_COMPLETE_REMINDER', label: 'Reminder to mark a finished call complete', category: '1:1 Call Bookings' },
  { type: 'MEETING_LINK_REQUESTED', label: 'A founder requests the mentor to add a meeting link', category: '1:1 Call Bookings' },
  { type: 'MEETING_LINK_REMINDER', label: 'Reminder to add a meeting link for an upcoming booking', category: '1:1 Call Bookings' },
  // Connections
  { type: 'REQUEST_RECEIVED', label: 'Someone sends me a connection request', category: 'Connections' },
  { type: 'REQUEST_ACCEPTED', label: 'A sent connection request is accepted', category: 'Connections' },
  { type: 'REQUEST_DECLINED', label: 'A sent connection request is declined', category: 'Connections' },
  // System
  { type: 'SYSTEM_HELPFUL_EMAILS', label: 'Send me genuinely useful emails every now and then to help me get the most out of ScaleDux', category: 'System' }
] as const

export type NotificationEmailType = (typeof NOTIFICATION_EMAIL_TYPES)[number]['type']

const TYPE_SET = new Set(NOTIFICATION_EMAIL_TYPES.map((t) => t.type))

export function isNotificationEmailType(value: string): value is NotificationEmailType {
  return TYPE_SET.has(value as NotificationEmailType)
}

export function getNotificationEmailTypes(): ReadonlyArray<{ type: NotificationEmailType; label: string; category: string }> {
  return NOTIFICATION_EMAIL_TYPES
}
