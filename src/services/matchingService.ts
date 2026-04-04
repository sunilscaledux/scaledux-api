/**
 * Matching service for scoring freelancer-project relevance.
 * Used by both browseProjects (freelancer side) and getMatchingServiceProviders (founder side).
 */

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface FreelancerProfile {
  categoryIds: number[];
  specialtyIds: number[];
  skills: string[];             // lowercased
  hourlyRate: number | null;
  countryName: string | null;
  showAsAgency: boolean;
  totalEarned: number;
}

export interface ProjectRequirements {
  categoryId: number | null;
  specialtyId: number | null;
  skillsRequired: string[];     // lowercased
  budgetAmount: number | null;
  estimatedHours: number | null;
  advancedPreferences: {
    hire_within?: string;
    earned_amount?: string;
    service_provider_type?: string;
  };
}

export interface MatchResult {
  match_score: number;          // 0-100
  matched_skills: string[];     // original-case skills that matched
}

// ─�� Weight config ───────────────────────────────────────────────────────────

const W_SKILLS    = 40;
const W_CATEGORY  = 20;
const W_SPECIALTY = 10;
const W_RATE      = 10;
const W_LOCATION  = 5;
const W_TYPE      = 5;
const W_EARNED    = 10;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Parse skills from various JSON formats to a lowercase string array. */
export function parseSkills(raw: any): string[] {
  if (!raw) return [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s: any) => (typeof s === 'string' ? s : s?.name ?? ''))
    .filter(Boolean)
    .map((s: string) => s.toLowerCase());
}

/** Parse specialty_ids JSON to number array. */
function parseSpecialtyIds(raw: any): number[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.filter((id: any) => typeof id === 'number');
}

/** Parse earned amount threshold from strings like "Any", "$1k+", "$10k+", "$100k+". */
function parseEarnedThreshold(str?: string): number | null {
  if (!str || str.toLowerCase() === 'any') return null;
  const match = str.replace(/[^0-9.kK]/g, '');
  const lower = match.toLowerCase();
  if (lower.includes('k')) {
    const num = parseFloat(lower.replace('k', ''));
    return isNaN(num) ? null : num * 1000;
  }
  const num = parseFloat(match);
  return isNaN(num) ? null : num;
}

/** Build FreelancerProfile from a Prisma user object with includes. */
export function   buildFreelancerProfile(user: any): FreelancerProfile {
  const expertises: any[] = user.expertises || [];
  const personalInfo = user.personalInfo;

  const categoryIds = [...new Set(expertises.map((e: any) => e.categoryId as number).filter(Boolean))];
  const specialtyIds = [...new Set(expertises.flatMap((e: any) => parseSpecialtyIds(e.specialty_ids)))];
  const skills = [...new Set(expertises.flatMap((e: any) => parseSkills(e.skills)))];

  return {
    categoryIds,
    specialtyIds,
    skills,
    hourlyRate: personalInfo?.hourly_rate ?? null,
    countryName: personalInfo?.country?.name ?? null,
    showAsAgency: personalInfo?.show_as_agency ?? false,
    totalEarned: 0, // TODO: compute from completed milestone payments
  };
}

/** Build ProjectRequirements from a Prisma FounderProject object. */
export function buildProjectRequirements(project: any): ProjectRequirements {
  const prefs = (project.advanced_preferences && typeof project.advanced_preferences === 'object')
    ? project.advanced_preferences as Record<string, any>
    : {};

  return {
    categoryId: project.expertise_category_id ?? null,
    specialtyId: project.specialty_id ?? null,
    skillsRequired: parseSkills(project.skills_required),
    budgetAmount: project.budget_amount ? parseFloat(project.budget_amount) : null,
    estimatedHours: prefs.estimated_hours ?? null,
    advancedPreferences: {
      hire_within: prefs.hire_within ?? prefs.location ?? undefined,
      earned_amount: prefs.earned_amount ?? undefined,
      service_provider_type: prefs.service_provider_type ?? undefined,
    },
  };
}

// ── Core scoring ────────────────────────────────────────────────────────────

function computeScore(
  freelancer: FreelancerProfile,
  project: ProjectRequirements,
  /** Original-case skills from freelancer for matched_skills output */
  originalSkills?: string[]
): MatchResult {
  let rawScore = 0;
  let maxPossible = 0;
  const matchedSkillsLower: string[] = [];

  // 1. Skills match (40)
  if (project.skillsRequired.length > 0) {
    maxPossible += W_SKILLS;
    const freelancerSkillSet = new Set(freelancer.skills);
    for (const skill of project.skillsRequired) {
      if (freelancerSkillSet.has(skill)) {
        matchedSkillsLower.push(skill);
      }
    }
    rawScore += (matchedSkillsLower.length / project.skillsRequired.length) * W_SKILLS;
  }

  // 2. Category match (20)
  if (project.categoryId != null) {
    maxPossible += W_CATEGORY;
    if (freelancer.categoryIds.includes(project.categoryId)) {
      rawScore += W_CATEGORY;
    }
  }

  // 3. Specialty match (10)
  if (project.specialtyId != null) {
    maxPossible += W_SPECIALTY;
    if (freelancer.specialtyIds.includes(project.specialtyId)) {
      rawScore += W_SPECIALTY;
    }
  }

  // 4. Rate compatibility (10)
  if (freelancer.hourlyRate != null && project.budgetAmount != null && project.budgetAmount > 0) {
    maxPossible += W_RATE;
    // If estimated_hours is available, derive effective hourly budget
    const effectiveBudget = project.estimatedHours && project.estimatedHours > 0
      ? project.budgetAmount / project.estimatedHours
      : project.budgetAmount;

    const ratio = freelancer.hourlyRate / effectiveBudget;
    if (ratio <= 1.0) rawScore += 10;
    else if (ratio <= 1.2) rawScore += 7;
    else if (ratio <= 1.5) rawScore += 4;
  }

  // 5. Location preference (5)
  const hirePref = project.advancedPreferences.hire_within;
  if (hirePref && hirePref.toLowerCase() !== 'anywhere') {
    maxPossible += W_LOCATION;
    if (freelancer.countryName && freelancer.countryName.toLowerCase() === hirePref.toLowerCase()) {
      rawScore += W_LOCATION;
    }
  } else {
    // No location restriction — full points
    maxPossible += W_LOCATION;
    rawScore += W_LOCATION;
  }

  // 6. Service provider type (5)
  const typePref = project.advancedPreferences.service_provider_type?.toLowerCase();
  maxPossible += W_TYPE;
  if (!typePref || typePref === 'any' || typePref === 'freelancer or agency') {
    rawScore += W_TYPE;
  } else if (typePref === 'agency' && freelancer.showAsAgency) {
    rawScore += W_TYPE;
  } else if ((typePref === 'freelancer' || typePref === 'individual') && !freelancer.showAsAgency) {
    rawScore += W_TYPE;
  }

  // 7. Earned amount (10)
  const earnedThreshold = parseEarnedThreshold(project.advancedPreferences.earned_amount);
  maxPossible += W_EARNED;
  if (earnedThreshold == null) {
    rawScore += W_EARNED; // No requirement → full points
  } else if (freelancer.totalEarned >= earnedThreshold) {
    rawScore += W_EARNED;
  } else if (earnedThreshold > 0) {
    rawScore += (freelancer.totalEarned / earnedThreshold) * W_EARNED;
  }

  // Normalize to 0-100
  const finalScore = maxPossible > 0 ? Math.round((rawScore / maxPossible) * 100) : 0;

  // Map matched skills back to original case
  const matchedSkillSet = new Set(matchedSkillsLower);
  const matched_skills = originalSkills
    ? originalSkills.filter(s => matchedSkillSet.has(s.toLowerCase()))
    : matchedSkillsLower;

  return { match_score: finalScore, matched_skills };
}

// ── Public API ──────────────────────────────────────────────────────────────

export class MatchingService {
  /**
   * Score a freelancer against a project (used in invite service providers tab).
   * @param freelancerData Raw Prisma user with expertises + personalInfo includes
   * @param projectData Raw Prisma FounderProject
   */
  static scoreFreelancerForProject(freelancerData: any, projectData: any): MatchResult {
    const freelancer = buildFreelancerProfile(freelancerData);
    const project = buildProjectRequirements(projectData);
    const originalSkills = (freelancerData.expertises || [])
      .flatMap((e: any) => {
        const raw = e.skills;
        if (!raw || !Array.isArray(raw)) return [];
        return raw.map((s: any) => (typeof s === 'string' ? s : s?.name ?? '')).filter(Boolean);
      });
    return computeScore(freelancer, project, originalSkills);
  }

  /**
   * Score a project against a freelancer (used in browse projects / freelancer homepage).
   * @param projectData Raw Prisma FounderProject
   * @param freelancerData Raw Prisma user with expertises + personalInfo includes
   */
  static scoreProjectForFreelancer(projectData: any, freelancerData: any): MatchResult {
    const freelancer = buildFreelancerProfile(freelancerData);
    const project = buildProjectRequirements(projectData);
    const originalSkills = Array.isArray(projectData.skills_required)
      ? projectData.skills_required.filter((s: any) => typeof s === 'string')
      : [];
    return computeScore(freelancer, project, originalSkills);
  }

  /**
   * Get scored + paginated project IDs using raw SQL.
   * Scoring happens entirely in PostgreSQL — only the page of IDs is returned.
   * Caller then fetches full project data for those IDs only.
   */
  static async getScoredProjectIds(
    freelancerProfile: FreelancerProfile,
    baseWhereSQL: string,
    whereParams: any[],
    page: number,
    limit: number
  ): Promise<{ ids: number[]; total: number }> {
    const { prisma } = await import('./prismaService');

    // Build SQL scoring expression matching our weights
    const scoreParts: string[] = [];
    let maxParts: string[] = [];

    // 1. Skills match (40 pts) — count overlapping skills in JSON array
    if (freelancerProfile.skills.length > 0) {
      const skillsJson = JSON.stringify(freelancerProfile.skills);
      scoreParts.push(`(
        CASE WHEN skills_required IS NOT NULL AND jsonb_typeof(skills_required) = 'array' AND jsonb_array_length(skills_required) > 0
        THEN (
          SELECT COUNT(*)::float FROM jsonb_array_elements_text(skills_required) AS elem
          WHERE LOWER(elem) = ANY(ARRAY[${freelancerProfile.skills.map(s => `'${s.replace(/'/g, "''")}'`).join(',')}])
        ) / jsonb_array_length(skills_required)::float * ${W_SKILLS}
        ELSE 0 END
      )`);
      maxParts.push(`CASE WHEN skills_required IS NOT NULL AND jsonb_typeof(skills_required) = 'array' AND jsonb_array_length(skills_required) > 0 THEN ${W_SKILLS} ELSE 0 END`);
    }

    // 2. Category match (20 pts)
    if (freelancerProfile.categoryIds.length > 0) {
      scoreParts.push(`(CASE WHEN expertise_category_id = ANY(ARRAY[${freelancerProfile.categoryIds.join(',')}]) THEN ${W_CATEGORY} ELSE 0 END)`);
      maxParts.push(`CASE WHEN expertise_category_id IS NOT NULL THEN ${W_CATEGORY} ELSE 0 END`);
    }

    // 3. Specialty match (10 pts)
    if (freelancerProfile.specialtyIds.length > 0) {
      scoreParts.push(`(CASE WHEN specialty_id = ANY(ARRAY[${freelancerProfile.specialtyIds.join(',')}]) THEN ${W_SPECIALTY} ELSE 0 END)`);
      maxParts.push(`CASE WHEN specialty_id IS NOT NULL THEN ${W_SPECIALTY} ELSE 0 END`);
    }

    // 4. Location + type + earned get base points (simplified in SQL — full scoring in JS for the page)
    // Give base points for dimensions we can't fully evaluate in SQL
    scoreParts.push(`${W_LOCATION + W_TYPE + W_EARNED}`);
    maxParts.push(`${W_LOCATION + W_TYPE + W_EARNED}`);

    // 5. Rate compatibility (10 pts) — compare freelancer hourly rate to project budget
    if (freelancerProfile.hourlyRate != null) {
      const rate = freelancerProfile.hourlyRate;
      scoreParts.push(`(
        CASE WHEN budget_amount IS NOT NULL AND budget_amount != ''
          AND CAST(budget_amount AS DECIMAL) > 0
        THEN
          CASE
            WHEN ${rate} / CAST(budget_amount AS DECIMAL) <= 1.0 THEN ${W_RATE}
            WHEN ${rate} / CAST(budget_amount AS DECIMAL) <= 1.2 THEN 7
            WHEN ${rate} / CAST(budget_amount AS DECIMAL) <= 1.5 THEN 4
            ELSE 0
          END
        ELSE 0 END
      )`);
      maxParts.push(`CASE WHEN budget_amount IS NOT NULL AND budget_amount != '' AND CAST(budget_amount AS DECIMAL) > 0 THEN ${W_RATE} ELSE 0 END`);
    }

    const rawScoreExpr = scoreParts.length > 0 ? scoreParts.join(' + ') : '0';
    const maxScoreExpr = maxParts.length > 0 ? maxParts.join(' + ') : '1';

    const scoreSQL = `CASE WHEN (${maxScoreExpr}) > 0 THEN ROUND((${rawScoreExpr})::numeric / (${maxScoreExpr})::numeric * 100) ELSE 0 END`;

    const offset = (page - 1) * limit;

    // Count query
    const countSQL = `SELECT COUNT(*)::int AS total FROM scd_founder_projects WHERE ${baseWhereSQL}`;
    const countResult: any[] = await prisma.$queryRawUnsafe(countSQL, ...whereParams);
    const total = countResult[0]?.total ?? 0;

    // Scored + paginated query
    const idsSQL = `
      SELECT id, (${scoreSQL}) AS match_score
      FROM scd_founder_projects
      WHERE ${baseWhereSQL}
      ORDER BY match_score DESC, created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const rows: any[] = await prisma.$queryRawUnsafe(idsSQL, ...whereParams);
    const ids = rows.map((r: any) => r.id);

    return { ids, total };
  }
}
