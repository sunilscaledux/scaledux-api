import { prisma } from '../../services/prismaService';
import {
  type ProfileCompletionSectionKey,
  type ProfileCompletionSectionsMap,
  type UserRole,
  getSectionsForRole,
  computeCompletionPercentage,
  getPendingSectionKeys,
} from '../../constants/profileCompletion';

export type ProfileCompletionResult = {
  totalPercentage: number;
  completedFields: Record<string, boolean>;
  fieldPercentages: Record<string, number>;
  pendingSectionKeys: ProfileCompletionSectionKey[];
  sectionsForRole: Array<{ key: string; label: string; weight: number; route: string; isCompleted: boolean }>;
};

/**
 * Normalize role from DB (may be uppercase or different).
 */
function normalizeRole(role: string | null | undefined): UserRole {
  if (!role) return 'freelancer';
  const r = role.toLowerCase();
  if (r === 'founder' || r === 'mentor' || r === 'investor') return r as UserRole;
  return 'freelancer';
}

/**
 * Ensure user has profile_sections initialized (all false for their role's keys). Used when sections are null (e.g. first time completion API is called).
 */
export async function ensureSectionsInitialized(userId: number, role: UserRole | string | null): Promise<void> {
  const pref = await prisma.userPreference.findUnique({
    where: { user_id: userId },
    select: { profile_sections: true },
  });
  if (pref?.profile_sections != null) return;
  await setProfileSectionsForRole(userId, role);
}

/**
 * Set profile_sections for the given role (all keys false, percentage 0). Call when user selects/updates role (PATCH /auth/role).
 */
export async function setProfileSectionsForRole(userId: number, role: UserRole | string | null): Promise<void> {
  const roleSections = getSectionsForRole(role);
  const initial: ProfileCompletionSectionsMap = {};
  for (const s of roleSections) {
    initial[s.key] = false;
  }
  await prisma.userPreference.upsert({
    where: { user_id: userId },
    create: { user_id: userId, profile_sections: initial as object },
    update: { profile_sections: initial as object },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { profile_completion_percentage: 0 },
  });
}

/**
 * Update one section's completion and recompute percentage. Call this whenever profile data changes.
 */
export async function updateCompletionSection(
  userId: number,
  sectionKey: ProfileCompletionSectionKey,
  completed: boolean
): Promise<void> {
  const [user, pref] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    prisma.userPreference.findUnique({ where: { user_id: userId }, select: { profile_sections: true } }),
  ]);
  if (!user) return;
  const current = (pref?.profile_sections as ProfileCompletionSectionsMap) || {};
  const next = { ...current, [sectionKey]: completed };
  const role = normalizeRole(user.role);
  const percentage = computeCompletionPercentage(next, role);
  await prisma.userPreference.upsert({
    where: { user_id: userId },
    create: { user_id: userId, profile_sections: next as object },
    update: { profile_sections: next as object },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { profile_completion_percentage: percentage },
  });
}

/**
 * Get profile completion for the user. Uses stored profile_sections (UserPreference) and role; returns role-based % and section list.
 */
export async function calculateProfileCompletion(userId: number): Promise<ProfileCompletionResult> {
  const [user, pref] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { profile_completion_percentage: true, role: true },
    }),
    prisma.userPreference.findUnique({
      where: { user_id: userId },
      select: { profile_sections: true },
    }),
  ]);
  if (!user) throw new Error('User not found');
  const role = normalizeRole(user.role);
  await ensureSectionsInitialized(userId, role);
  const sections = (pref?.profile_sections as ProfileCompletionSectionsMap) || {};
  const roleSections = getSectionsForRole(role);
  const totalPercentage =
    user.profile_completion_percentage != null
      ? user.profile_completion_percentage
      : computeCompletionPercentage(sections, role);
  const completedFields: Record<string, boolean> = {};
  const fieldPercentages: Record<string, number> = {};
  for (const s of roleSections) {
    completedFields[s.key] = sections[s.key] === true;
    fieldPercentages[s.key] = s.weight;
  }
  const pendingSectionKeys = getPendingSectionKeys(sections, role);
  const sectionsForRole = roleSections.map((s) => ({
    key: s.key,
    label: s.label,
    weight: s.weight,
    route: s.route,
    isCompleted: sections[s.key] === true,
  }));
  return {
    totalPercentage,
    completedFields,
    fieldPercentages,
    pendingSectionKeys,
    sectionsForRole,
  };
}

export default {
  calculateProfileCompletion,
  updateCompletionSection,
  ensureSectionsInitialized,
  setProfileSectionsForRole,
};
