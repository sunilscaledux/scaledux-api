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
  | 'identityVerification';

export type UserRole = 'freelancer' | 'founder' | 'mentor' | 'investor';

export interface SectionConfig {
  key: ProfileCompletionSectionKey;
  weight: number;
  label: string;
  route: string;
  /** Roles that have this section (completion % is computed only from these). */
  roles: UserRole[];
}

/** All sections with weights and which roles include them. */
export const PROFILE_COMPLETION_SECTIONS: SectionConfig[] = [
  { key: 'profilePicture', weight: 3, label: 'Profile Picture', route: '/my-profile', roles: ['freelancer', 'founder', 'mentor', 'investor'] },
  { key: 'profileCover', weight: 3, label: 'Profile Cover', route: '/my-profile', roles: ['freelancer', 'founder', 'mentor', 'investor'] },
  { key: 'profileSummary', weight: 12, label: 'Profile Summary', route: '/my-profile', roles: ['freelancer', 'founder', 'mentor', 'investor'] },
  { key: 'personalInfo', weight: 6, label: 'Personal Info', route: '/my-profile', roles: ['freelancer', 'founder', 'mentor', 'investor'] },
  { key: 'skillsExpertise', weight: 16, label: 'Skills / Expertise', route: '/my-profile', roles: ['freelancer', 'mentor', 'investor'] },
  { key: 'workExperience', weight: 8, label: 'Work Experience', route: '/my-profile', roles: ['freelancer', 'founder', 'mentor', 'investor'] },
  { key: 'portfolio', weight: 14, label: 'Portfolio', route: '/portfolio', roles: ['freelancer', 'founder', 'mentor', 'investor'] },
  { key: 'hourlyRate', weight: 6, label: 'Hourly Rate', route: '/my-profile', roles: ['freelancer', 'mentor', 'investor'] },
  { key: 'availableHoursPerWeek', weight: 6, label: 'Available hours per week', route: '/my-profile', roles: ['freelancer'] },
  { key: 'education', weight: 4, label: 'Education', route: '/my-profile', roles: ['freelancer', 'founder', 'mentor', 'investor'] },
  { key: 'licenseCertifications', weight: 4, label: 'License & Certifications', route: '/my-profile', roles: ['freelancer', 'mentor', 'investor'] },
  { key: 'languages', weight: 2, label: 'Languages', route: '/my-profile', roles: ['freelancer', 'mentor', 'investor'] },
  { key: 'achievements', weight: 2, label: 'Achievements & Recognitions', route: '/my-profile', roles: ['freelancer', 'founder', 'mentor', 'investor'] },
  { key: 'emailVerification', weight: 3, label: 'Email Verification', route: '/verify/email', roles: ['freelancer', 'founder', 'mentor', 'investor'] },
  { key: 'phoneVerification', weight: 3, label: 'Phone Verification', route: '/verify/phone-number', roles: ['freelancer', 'founder', 'mentor', 'investor'] },
  { key: 'identityVerification', weight: 14, label: 'Identity Verification', route: '/verify/identity', roles: ['freelancer', 'founder', 'mentor', 'investor'] },
];

export type ProfileCompletionSectionsMap = Record<string, boolean>;

/** Sections for a given role (used for % and pending list). */
export function getSectionsForRole(role: UserRole | string | null): SectionConfig[] {
  const r = role === 'founder' || role === 'freelancer' || role === 'mentor' || role === 'investor' ? role : 'freelancer';
  return PROFILE_COMPLETION_SECTIONS.filter((s) => s.roles.includes(r));
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
