import { resolveFileUrl } from '@admin/utils/url';

/** Build a display name from a user row. */
export function userName(u: { first_name?: string | null; middle_name?: string | null; last_name?: string | null } | null | undefined): string {
  if (!u) return 'Unknown';
  return [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(' ').trim() || 'Unknown';
}

/** Compact user card used across list/detail responses. */
export function userCard(u: any) {
  if (!u) return null;
  return {
    id: u.id,
    unique_id: u.unique_id,
    name: userName(u),
    email: u.email,
    phone: u.phone,
    role: u.role,
    status: u.status,
    avatar: resolveFileUrl(u.personalInfo?.profileImage ?? null),
  };
}

/** Prisma `select` fragment to hydrate userCard(). */
export const userCardSelect = {
  id: true,
  unique_id: true,
  first_name: true,
  middle_name: true,
  last_name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  personalInfo: { select: { profileImage: true } },
} as const;
