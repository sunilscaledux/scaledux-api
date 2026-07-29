import { prisma } from "@services/prismaService";
import { isNameMatch } from "@utils/nameMatch";

export type NameCheckContext = 'tax' | 'bank';

export interface ReferenceName {
  source: 'identity' | 'agency' | 'tax';
  label: string;
  name: string;
}

export interface NameSources {
  /** Identity document (INDIVIDUAL) or agency verification (AGENCY). Every other name hangs off this. */
  anchor: ReferenceName | null;
  refs: ReferenceName[];
}

export interface NameCheckResult {
  valid: boolean;
  message: string | null;
  /** True when the user has no verified document to check against yet. */
  requiresVerification?: boolean;
  source?: ReferenceName['source'];
}

/** Document the identity name came from. Never echo the verified name itself back to the user. */
const IDENTITY_LABELS: Record<string, string> = {
  aadhaar: 'verified Aadhaar',
  'driving-license': 'verified driving licence',
};

/** Prompt shown when there is no verified document to anchor names to. */
export const anchorMissingMessage = (entityType: string): string =>
  entityType === 'AGENCY'
    ? 'Please complete your company / agency verification first. Your company name has to match the verified record.'
    : 'Please complete your identity verification first. Your name has to match your verified identity document.';

/** Verified names already on record for this user and entity type. */
export async function getNameSources(
  userId: number,
  entityType: string,
  context: NameCheckContext,
): Promise<NameSources> {
  let anchor: ReferenceName | null = null;

  if (entityType === 'AGENCY') {
    const agency = await prisma.agencyVerification.findFirst({
      where: { user_id: userId, status: 'APPROVED' },
      orderBy: { created_at: 'desc' },
      select: { agency_name: true },
    });
    if (agency?.agency_name) {
      anchor = { source: 'agency', label: 'verified company / agency name', name: agency.agency_name };
    }
  } else {
    const identity = await prisma.identityVerification.findFirst({
      where: { user_id: userId, status: 'APPROVED' },
      orderBy: { created_at: 'desc' },
      select: { meta_data: true, verification_type: true },
    });
    const identityName = (identity?.meta_data as any)?.name;
    if (typeof identityName === 'string' && identityName.trim()) {
      const label = IDENTITY_LABELS[identity?.verification_type || ''] || 'verified identity document';
      anchor = { source: 'identity', label, name: identityName.trim() };
    }
  }

  const refs: ReferenceName[] = anchor ? [anchor] : [];

  // Bank details additionally have to agree with the PAN-verified tax name
  if (context === 'bank') {
    const taxInfo = await (prisma as any).taxInformation.findFirst({
      where: { user_id: userId, entity_type: entityType },
      select: { name: true },
    });
    if (taxInfo?.name) {
      refs.push({ source: 'tax', label: 'verified PAN name', name: taxInfo.name });
    }
  }

  return { anchor, refs };
}

/**
 * Compare a name against every verified name on record.
 * Messages name the document, never the verified name held on it.
 */
export function matchAgainstReferences(
  name: string | null | undefined,
  refs: ReferenceName[],
  subject?: string,
): NameCheckResult {
  for (const ref of refs) {
    if (!isNameMatch(name, ref.name)) {
      return {
        valid: false,
        message: `${subject || 'The name you entered'} does not match your ${ref.label}. Please enter it exactly as it appears there.`,
        source: ref.source,
      };
    }
  }
  return { valid: true, message: null };
}

/** Real-time check used while the user is typing, and re-run server-side on submit. */
export async function checkNameAgainstVerifiedRecords(
  userId: number,
  entityType: string,
  name: string,
  context: NameCheckContext,
): Promise<NameCheckResult> {
  const { anchor, refs } = await getNameSources(userId, entityType, context);
  if (!anchor) {
    return { valid: false, requiresVerification: true, message: anchorMissingMessage(entityType) };
  }
  return matchAgainstReferences(name, refs);
}
