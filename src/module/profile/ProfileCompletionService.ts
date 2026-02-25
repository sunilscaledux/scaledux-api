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
 * Ensure user has profile_completion_sections initialized (all false for their role's keys).
 */
export async function ensureSectionsInitialized(userId: number, role: UserRole | string | null): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profile_completion_sections: true },
  });
  if (!user || user.profile_completion_sections != null) return;
  const roleSections = getSectionsForRole(role);
  const initial: ProfileCompletionSectionsMap = {};
  for (const s of roleSections) {
    initial[s.key] = false;
  }
  await prisma.user.update({
    where: { id: userId },
    data: { profile_completion_sections: initial as object },
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profile_completion_sections: true, role: true },
  });
  if (!user) return;
  const current = (user.profile_completion_sections as ProfileCompletionSectionsMap) || {};
  const next = { ...current, [sectionKey]: completed };
  const role = normalizeRole(user.role);
  const percentage = computeCompletionPercentage(next, role);
  await prisma.user.update({
    where: { id: userId },
    data: {
      profile_completion_sections: next as object,
      profile_completion_percentage: percentage,
    },
  });
}

/**
 * Get profile completion for the user. Uses stored profile_completion_sections and role; returns role-based % and section list.
 */
export async function calculateProfileCompletion(userId: number): Promise<ProfileCompletionResult> {
  let user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profile_completion_sections: true, profile_completion_percentage: true, role: true },
  });
  if (!user) throw new Error('User not found');
  const role = normalizeRole(user.role);
  await ensureSectionsInitialized(userId, role);
  if (user.profile_completion_sections == null) {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profile_completion_sections: true, profile_completion_percentage: true, role: true },
    }) as typeof user;
  }
  const sections = (user!.profile_completion_sections as ProfileCompletionSectionsMap) || {};
  const roleSections = getSectionsForRole(role);
  const totalPercentage =
    user!.profile_completion_percentage != null
      ? user!.profile_completion_percentage
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
};
