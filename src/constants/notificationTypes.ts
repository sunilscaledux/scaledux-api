

export const NOTIFICATION_EMAIL_TYPES = [
  // Recruiting
  // { type: 'INTERVIEW_ACCEPTED_OR_OFFER_MODIFIED', label: 'An interview is accepted or offer terms are modified', category: 'Recruiting' },
  // { type: 'INTERVIEW_OR_OFFER_DECLINED_WITHDRAWN', label: 'An interview or offer is declined or withdrawn', category: 'Recruiting' },
  // { type: 'OFFER_ACCEPTED', label: 'An offer is accepted', category: 'Recruiting' },
  // { type: 'JOB_POSTING_EXPIRING_SOON', label: 'A job posting will expire soon', category: 'Recruiting' },
  // { type: 'JOB_POSTING_EXPIRED', label: 'A job posting expired', category: 'Recruiting' },
  // { type: 'NO_INTERVIEWS_INITIATED', label: 'No interviews have been initiated', category: 'Recruiting' },
  // Proposals
  { type: 'PROJECT_INVITATION', label: 'Project invitation', category: 'Proposals' },
  { type: 'INVITATION_ACCEPTED', label: 'An invitation is accepted', category: 'Proposals' },
  { type: 'INVITATION_REJECTED', label: 'An invitation is rejected', category: 'Proposals' },
  { type: 'PROPOSAL_RECEIVED', label: 'A proposal is received', category: 'Proposals' },
  { type: 'PROPOSAL_ACCEPTED', label: 'A proposal is accepted', category: 'Proposals' },
  { type: 'PROPOSAL_REJECTED', label: 'A proposal is rejected', category: 'Proposals' },
  { type: 'JOB_APPLIED_CANCELLED_OR_CLOSED', label: 'A job I applied to has been cancelled or closed', category: 'Proposals' },
  { type: 'PROPOSAL_WITHDRAWN', label: 'A proposal is withdrawn', category: 'Proposals' },
  { type: 'PROPOSAL_CHANGE_REQUESTED', label: 'Changes requested on a proposal', category: 'Proposals' },
  { type: 'OFFER_SENT', label: 'Offer sent', category: 'Proposals' },
  { type: 'DELIVERABLE_SUBMITTED', label: 'Deliverable submitted', category: 'Proposals' },
  { type: 'DELIVERABLE_APPROVED', label: 'Deliverable approved', category: 'Proposals' },
  { type: 'PAYMENT_RELEASED', label: 'Payment released', category: 'Proposals' },
  // Connections
  { type: 'REQUEST_RECEIVED', label: 'Someone sends me a request', category: 'Connections' },
  { type: 'REQUEST_ACCEPTED', label: 'Sent request is accepted', category: 'Connections' },
  { type: 'REQUEST_DECLINED', label: 'Sent request is declined', category: 'Connections' },
  // Subscriptions
  // { type: 'SUBSCRIPTION_EVENT', label: 'Subscription related event occur', category: 'Subscriptions' },
  // Bookings
  { type: 'BOOKING_REQUESTED', label: 'A new booking request is received', category: 'Bookings' },
  { type: 'BOOKING_CONFIRMED', label: 'A booking is confirmed after payment', category: 'Bookings' },
  { type: 'BOOKING_CANCELLED', label: 'A booking is cancelled', category: 'Bookings' },
  { type: 'BOOKING_RESCHEDULE_REQUESTED', label: 'A mentor requests to reschedule a booking', category: 'Bookings' },
  { type: 'MEETING_LINK_ADDED', label: 'A meeting link is added or updated', category: 'Bookings' },
  { type: 'BOOKING_COMPLETED', label: 'A booking is marked complete by the mentor', category: 'Bookings' },
  { type: 'BOOKING_RATE_PROMPT', label: 'A completed booking is ready to review', category: 'Bookings' },
  { type: 'BOOKING_COMPLETE_REMINDER', label: 'Reminder to mark a finished call complete', category: 'Bookings' },
  { type: 'MEETING_LINK_REQUESTED', label: 'A founder requests the mentor to add a meeting link', category: 'Bookings' },
  { type: 'MEETING_LINK_REMINDER', label: 'Reminder to add a meeting link for an upcoming booking', category: 'Bookings' },
  // System (single opt-in style)
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
