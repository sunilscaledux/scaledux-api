import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { Prisma } from '@prisma/client';
import { paginated } from '@admin/utils/pagination';
import { userCard, userCardSelect } from '@admin/utils/format';
import { resolveAdminFiles } from '@admin/utils/attachments';
import { decryptPii, isEncrypted, identityImageContext } from '@utils/crypto';
import { Log } from '@services/loggerService';

const VALID = ['APPROVED', 'REJECTED', 'UNDER_REVIEW'];

const ADDRESS_ORDER = [
  'careOf', 'house', 'street', 'landmark', 'locality', 'postOffice',
  'vtc', 'subDistrict', 'district', 'state', 'pincode', 'country',
];

/** DigiLocker stores the address as an object; flatten it to one displayable line. */
function formatAddress(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'object') return String(value).trim() || null;

  const src = value as Record<string, unknown>;
  const keys = [
    ...ADDRESS_ORDER.filter((k) => k in src),
    ...Object.keys(src).filter((k) => !ADDRESS_ORDER.includes(k)),
  ];

  const seen = new Set<string>();
  const parts: string[] = [];
  for (const key of keys) {
    const part = src[key] == null ? '' : String(src[key]).trim();
    if (!part || seen.has(part.toLowerCase())) continue;
    seen.add(part.toLowerCase());
    parts.push(part);
  }
  return parts.join(', ') || null;
}

/** Document photo is stored encrypted as bare base64; return something an <img> can load. */
function documentPhoto(value: unknown, userId: number): string | null {
  if (typeof value !== 'string' || !value) return null;

  let raw = value;
  if (isEncrypted(value)) {
    try {
      raw = decryptPii(value, identityImageContext(userId));
    } catch (err: any) {
      Log.error(`[admin][verification] Could not decrypt document photo for user ${userId}`, { message: err?.message });
      return null;
    }
  }
  if (!raw) return null;
  return /^(https?:|data:)/i.test(raw) ? raw : `data:image/jpeg;base64,${raw}`;
}

/**
 * Only primitives reach the client — a nested object in meta_data used to crash the
 * review dialog when React tried to render it as a child.
 */
function identityMeta(meta: unknown, userId: number): Record<string, unknown> | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta as Record<string, unknown>)) {
    if (value == null || value === '') continue;
    if (key === 'address') { out.address = formatAddress(value); continue; }
    if (key === 'image') { out.image = documentPhoto(value, userId); continue; }

    if (Array.isArray(value)) {
      const flat = value.filter((v) => v != null && typeof v !== 'object').map(String).join(', ');
      if (flat) out[key] = flat;
    } else if (typeof value === 'object') {
      out[key] = formatAddress(value);
    } else {
      out[key] = value;
    }
  }

  for (const key of Object.keys(out)) {
    if (out[key] == null) delete out[key];
  }
  return out;
}

export interface VerificationListParams {
  page: number;
  limit: number;
  skip: number;
  status?: string;
  created?: Prisma.DateTimeFilter | undefined;
}

export class VerificationService {
  static async listIdentity(p: VerificationListParams): Promise<ServiceResponse> {
    const where: Record<string, any> = {};
    if (p.status) where.status = p.status;
    if (p.created) where.created_at = p.created;

    const [rows, total] = await Promise.all([
      prisma.identityVerification.findMany({
        where,
        include: { user: { select: userCardSelect } },
        orderBy: { created_at: 'desc' },
        skip: p.skip,
        take: p.limit,
      }),
      prisma.identityVerification.count({ where }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      verification_type: r.verification_type,
      status: r.status,
      meta_data: identityMeta(r.meta_data, r.user_id),
      submitted_at: r.submitted_at,
      verified_at: r.verified_at,
      rejection_reason: r.rejection_reason,
      created_at: r.created_at,
      user: userCard(r.user),
    }));
    return { success: true, message: 'OK', data: paginated(items, total, p.page, p.limit) };
  }

  static async reviewIdentity(
    id: number,
    body: { status?: string; rejection_reason?: unknown }
  ): Promise<ServiceResponse> {
    const { status, rejection_reason } = body;
    if (!VALID.includes(status as string)) {
      return { success: false, message: `status must be one of ${VALID.join(', ')}`, statusCode: 400 };
    }

    const record = await prisma.identityVerification.findUnique({ where: { id } });
    if (!record) return { success: false, message: 'Verification not found', statusCode: 404 };

    const verified = status === 'APPROVED';
    await prisma.$transaction([
      prisma.identityVerification.update({
        where: { id },
        data: {
          status,
          rejection_reason: status === 'REJECTED' ? (rejection_reason as string) ?? null : null,
          verified_at: verified ? new Date() : null,
        },
      }),
      prisma.user.update({
        where: { id: record.user_id },
        data: { identity_verification_status: status, identity_verified_at: verified ? new Date() : null },
      }),
    ]);

    return { success: true, message: `Identity verification ${status!.toLowerCase()}`, data: null };
  }

  static async listAgency(p: VerificationListParams): Promise<ServiceResponse> {
    const where: Record<string, any> = {};
    if (p.status) where.status = p.status;
    if (p.created) where.created_at = p.created;

    const [rows, total] = await Promise.all([
      prisma.agencyVerification.findMany({
        where,
        include: { user: { select: userCardSelect } },
        orderBy: { created_at: 'desc' },
        skip: p.skip,
        take: p.limit,
      }),
      prisma.agencyVerification.count({ where }),
    ]);

    const items = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        agency_name: r.agency_name,
        cin: r.cin,
        documents: await resolveAdminFiles(r.document_urls),
        status: r.status,
        submitted_at: r.submitted_at,
        verified_at: r.verified_at,
        verified_by: r.verified_by,
        rejection_reason: r.rejection_reason,
        created_at: r.created_at,
        user: userCard(r.user),
      }))
    );
    return { success: true, message: 'OK', data: paginated(items, total, p.page, p.limit) };
  }

  static async reviewAgency(
    id: number,
    body: { status?: string; rejection_reason?: unknown },
    verifiedBy: number
  ): Promise<ServiceResponse> {
    const { status, rejection_reason } = body;
    if (!VALID.includes(status as string)) {
      return { success: false, message: `status must be one of ${VALID.join(', ')}`, statusCode: 400 };
    }

    const record = await prisma.agencyVerification.findUnique({ where: { id } });
    if (!record) return { success: false, message: 'Verification not found', statusCode: 404 };

    const verified = status === 'APPROVED';
    await prisma.$transaction([
      prisma.agencyVerification.update({
        where: { id },
        data: {
          status,
          rejection_reason: status === 'REJECTED' ? (rejection_reason as string) ?? null : null,
          verified_at: verified ? new Date() : null,
          verified_by: verifiedBy,
        },
      }),
      prisma.user.update({
        where: { id: record.user_id },
        data: { agency_verification_status: status, agency_verified_at: verified ? new Date() : null },
      }),
    ]);

    return { success: true, message: `Agency verification ${status!.toLowerCase()}`, data: null };
  }
}
