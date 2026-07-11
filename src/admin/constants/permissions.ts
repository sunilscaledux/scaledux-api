/**
 * Permission model.
 *
 * Each admin has an AdminRole. A role maps to a default set of permission keys.
 * The Admin.permissions JSON column can override (grant extra keys) for a
 * specific admin. SUPER_ADMIN implicitly has every permission ("*").
 */

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',

  // Users
  USERS_VIEW: 'users.view',
  USERS_EDIT: 'users.edit',
  USERS_SUSPEND: 'users.suspend',
  USERS_DELETE: 'users.delete',
  USERS_IMPERSONATE: 'users.impersonate',

  // Verifications (identity / agency)
  VERIFICATIONS_VIEW: 'verifications.view',
  VERIFICATIONS_REVIEW: 'verifications.review',

  // Projects
  PROJECTS_VIEW: 'projects.view',
  PROJECTS_MODERATE: 'projects.moderate',

  // Proposals
  PROPOSALS_VIEW: 'proposals.view',
  PROPOSALS_MODERATE: 'proposals.moderate',

  // Bookings
  BOOKINGS_VIEW: 'bookings.view',
  BOOKINGS_MANAGE: 'bookings.manage',

  // Billing / payments
  BILLING_VIEW: 'billing.view',
  BILLING_REFUND: 'billing.refund',
  BILLING_PAYOUT: 'billing.payout',

  // Reports / disputes
  REPORTS_VIEW: 'reports.view',
  REPORTS_RESOLVE: 'reports.resolve',

  // Reviews
  REVIEWS_VIEW: 'reviews.view',
  REVIEWS_MODERATE: 'reviews.moderate',

  // Content / taxonomy
  CONTENT_VIEW: 'content.view',
  CONTENT_MANAGE: 'content.manage',

  // Constants / option lists (reasons, stages, models, types)
  CONSTANTS_VIEW: 'constants.view',
  CONSTANTS_MANAGE: 'constants.manage',

  // Notifications / announcements
  NOTIFICATIONS_SEND: 'notifications.send',

  // Admin management
  ADMINS_VIEW: 'admins.view',
  ADMINS_MANAGE: 'admins.manage',

  // Audit log
  AUDIT_VIEW: 'audit.view',

  // Security / anomaly monitoring (device & session fingerprints)
  SECURITY_VIEW: 'security.view',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL = Object.values(PERMISSIONS);

const READ_ONLY = [
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.VERIFICATIONS_VIEW,
  PERMISSIONS.PROJECTS_VIEW,
  PERMISSIONS.PROPOSALS_VIEW,
  PERMISSIONS.BOOKINGS_VIEW,
  PERMISSIONS.BILLING_VIEW,
  PERMISSIONS.REPORTS_VIEW,
  PERMISSIONS.REVIEWS_VIEW,
  PERMISSIONS.CONTENT_VIEW,
  PERMISSIONS.CONSTANTS_VIEW,
];

export const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  // SUPER_ADMIN handled specially as "*" — listed here for completeness.
  SUPER_ADMIN: ALL,

  ADMIN: [
    ...READ_ONLY,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.USERS_SUSPEND,
    PERMISSIONS.USERS_IMPERSONATE,
    PERMISSIONS.VERIFICATIONS_REVIEW,
    PERMISSIONS.PROJECTS_MODERATE,
    PERMISSIONS.PROPOSALS_MODERATE,
    PERMISSIONS.BOOKINGS_MANAGE,
    PERMISSIONS.BILLING_REFUND,
    PERMISSIONS.BILLING_PAYOUT,
    PERMISSIONS.REPORTS_RESOLVE,
    PERMISSIONS.REVIEWS_MODERATE,
    PERMISSIONS.CONTENT_MANAGE,
    PERMISSIONS.CONSTANTS_MANAGE,
    PERMISSIONS.NOTIFICATIONS_SEND,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.SECURITY_VIEW,
  ],

  MODERATOR: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_SUSPEND,
    PERMISSIONS.PROJECTS_VIEW,
    PERMISSIONS.PROJECTS_MODERATE,
    PERMISSIONS.PROPOSALS_VIEW,
    PERMISSIONS.PROPOSALS_MODERATE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_RESOLVE,
    PERMISSIONS.REVIEWS_VIEW,
    PERMISSIONS.REVIEWS_MODERATE,
    PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.CONTENT_MANAGE,
    PERMISSIONS.CONSTANTS_VIEW,
    PERMISSIONS.CONSTANTS_MANAGE,
    PERMISSIONS.VERIFICATIONS_VIEW,
    PERMISSIONS.VERIFICATIONS_REVIEW,
    PERMISSIONS.SECURITY_VIEW,
  ],

  FINANCE: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_REFUND,
    PERMISSIONS.BILLING_PAYOUT,
    PERMISSIONS.BOOKINGS_VIEW,
    PERMISSIONS.AUDIT_VIEW,
  ],

  SUPPORT: [...READ_ONLY],
};

/** Effective permission set for an admin (role defaults + per-admin overrides). */
export function resolvePermissions(role: string, overrides?: unknown): Set<string> {
  if (role === 'SUPER_ADMIN') return new Set(['*']);
  const base = ROLE_PERMISSIONS[role] || [];
  const extra = Array.isArray(overrides) ? (overrides as string[]) : [];
  return new Set<string>([...base, ...extra]);
}

export function hasPermission(role: string, overrides: unknown, key: PermissionKey): boolean {
  const set = resolvePermissions(role, overrides);
  return set.has('*') || set.has(key);
}
