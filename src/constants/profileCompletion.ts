/**
 * Profile completion: role-based section config.
 * Section keys are stored in UserPreference.profile_sections as { [key]: boolean }. Initialized per role on first login/register.
 * When a user updates a section (e.g. profile picture), we set that key to true; when they remove content, false.
 */

export type ProfileCompletionSectionKey =
  | 'profilePicture'
  | 'profileCover'
  | 'profileSummary'
  | 'personalInfo'
  | 'skillsExpertise'
  | 'workExperience'
  | 'portfolio'
  | 'hourlyRate'
  | 'availableHoursPerWeek'
  | 'education'
  | 'licenseCertifications'
  | 'languages'
  | 'achievements'
  | 'emailVerification'
  | 'phoneVerification'
  | 'identityVerification'
  | 'successStoryHighlights';

export type UserRole = 'freelancer' | 'founder' | 'mentor' | 'investor';

export interface SectionConfig {
  key: ProfileCompletionSectionKey;
  weight: number;
  label: string;
  route: string;
  /** Roles that have this section (completion % is computed only from these). */
  roles: UserRole[];
}

/**
 * Per-role weight overrides.
 * If a role has an entry here, that weight is used instead of the default.
 * If a section is not listed for a role, it's not included for that role.
 */
const ROLE_WEIGHTS: Record<UserRole, Partial<Record<ProfileCompletionSectionKey, number>>> = {
  freelancer: {
    profilePicture: 3,
    profileCover: 2,
    profileSummary: 10,
    personalInfo: 5,
    skillsExpertise: 12,
    workExperience: 10,
    portfolio: 16,
    hourlyRate: 4,
    availableHoursPerWeek: 4,
    education: 3,
    licenseCertifications: 3,
    languages: 2,
    achievements: 3,
    emailVerification: 2,
    phoneVerification: 3,
    identityVerification: 18,
  },
  founder: {
    profilePicture: 3,
    profileCover: 3,
    profileSummary: 10,
    personalInfo: 6,
    skillsExpertise: 10,
    workExperience: 10,
    education: 6,
    licenseCertifications: 6,
    languages: 3,
    achievements: 8,
    emailVerification: 5,
    phoneVerification: 5,
    identityVerification: 25,
  },
  mentor: {
    profilePicture: 3,
    profileCover: 3,
    profileSummary: 10,
    personalInfo: 6,
    skillsExpertise: 10,
    workExperience: 10,
    education: 6,
    licenseCertifications: 6,
    languages: 3,
    achievements: 5,
    emailVerification: 5,
    phoneVerification: 5,
    identityVerification: 23,
    successStoryHighlights: 5,
  },
  investor: {
    profilePicture: 3,
    profileCover: 2,
    profileSummary: 10,
    personalInfo: 5,
    skillsExpertise: 12,
    workExperience: 10,
    portfolio: 16,
    hourlyRate: 4,
    education: 3,
    licenseCertifications: 3,
    languages: 2,
    achievements: 3,
    emailVerification: 2,
    phoneVerification: 3,
    identityVerification: 18,
  },
};

/** Master section list with labels and routes. */
const SECTION_META: Record<ProfileCompletionSectionKey, { label: string; route: string }> = {
  profilePicture: { label: 'Profile Picture', route: '/my-profile' },
  profileCover: { label: 'Profile Cover', route: '/my-profile' },
  profileSummary: { label: 'Profile Summary', route: '/my-profile' },
  personalInfo: { label: 'Personal Info', route: '/my-profile' },
  skillsExpertise: { label: 'Skills / Expertise', route: '/my-profile' },
  workExperience: { label: 'Work Experience', route: '/my-profile' },
  portfolio: { label: 'Portfolio', route: '/portfolio' },
  hourlyRate: { label: 'Hourly Rate', route: '/my-profile' },
  availableHoursPerWeek: { label: 'Available hours per week', route: '/my-profile' },
  education: { label: 'Education', route: '/my-profile' },
  licenseCertifications: { label: 'License & Certifications', route: '/my-profile' },
  languages: { label: 'Languages', route: '/my-profile' },
  achievements: { label: 'Achievements & Recognitions', route: '/my-profile' },
  emailVerification: { label: 'Email Verification', route: '/verify/email' },
  phoneVerification: { label: 'Phone Verification', route: '/verify/phone-number' },
  identityVerification: { label: 'Identity Verification', route: '/verify/identity' },
  successStoryHighlights: { label: 'Success Story Highlights', route: '/my-profile' },
};

export type ProfileCompletionSectionsMap = Record<string, boolean>;

/** Sections for a given role with role-specific weights. */
export function getSectionsForRole(role: UserRole | string | null): SectionConfig[] {
  const r = role === 'founder' || role === 'freelancer' || role === 'mentor' || role === 'investor' ? role : 'freelancer';
  const weights = ROLE_WEIGHTS[r];
  return (Object.keys(weights) as ProfileCompletionSectionKey[]).map((key) => ({
    key,
    weight: weights[key]!,
    label: SECTION_META[key].label,
    route: SECTION_META[key].route,
    roles: [r],
  }));
}

/** Total weight for a role (denominator for %). */
export function getTotalWeightForRole(role: UserRole | string | null): number {
  return getSectionsForRole(role).reduce((sum, s) => sum + s.weight, 0);
}

/** Compute completion percentage from sections JSON and role. */
export function computeCompletionPercentage(
  sections: ProfileCompletionSectionsMap | null | undefined,
  role: UserRole | string | null
): number {
  const roleSections = getSectionsForRole(role);
  const totalWeight = roleSections.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return 0;
  let earned = 0;
  for (const config of roleSections) {
    if (sections && sections[config.key] === true) earned += config.weight;
  }
  return Math.min(100, Math.round((earned / totalWeight) * 100));
}

/** Pending section keys for role (incomplete). */
export function getPendingSectionKeys(
  sections: ProfileCompletionSectionsMap | null | undefined,
  role: UserRole | string | null
): ProfileCompletionSectionKey[] {
  const roleSections = getSectionsForRole(role);
  return roleSections.filter((s) => !sections || sections[s.key] !== true).map((s) => s.key);
}

/**
 * Mandatory sections that MUST be completed before a freelancer can submit proposals or appear in invite lists.
 * Even if profile completion ≥ threshold, these are enforced individually.
 */
export const MANDATORY_SECTIONS: ProfileCompletionSectionKey[] = [
  'profilePicture',
  'profileCover',
  'profileSummary',
  'skillsExpertise',
  'workExperience',
  'portfolio',
  'hourlyRate',
  'availableHoursPerWeek',
  'education',
  'emailVerification',
  'phoneVerification',
  'identityVerification',
];

/** Get incomplete mandatory sections with labels. */
export function getIncompleteMandatorySections(
  sections: ProfileCompletionSectionsMap | null | undefined,
  role: UserRole | string | null
): { key: ProfileCompletionSectionKey; label: string; route: string }[] {
  const roleSections = getSectionsForRole(role);
  const roleKeys = new Set(roleSections.map((s) => s.key));
  return MANDATORY_SECTIONS
    .filter((key) => roleKeys.has(key) && (!sections || sections[key] !== true))
    .map((key) => ({ key, label: SECTION_META[key].label, route: SECTION_META[key].route }));
}

/** Check if all mandatory sections are complete. */
export function areMandatorySectionsComplete(
  sections: ProfileCompletionSectionsMap | null | undefined,
  role: UserRole | string | null
): boolean {
  return getIncompleteMandatorySections(sections, role).length === 0;
}
