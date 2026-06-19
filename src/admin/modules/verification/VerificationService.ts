import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { Prisma } from '@prisma/client';
import { paginated } from '@admin/utils/pagination';
import { userCard, userCardSelect } from '@admin/utils/format';
import { resolveAdminFiles } from '@admin/utils/attachments';

const VALID = ['APPROVED', 'REJECTED', 'UNDER_REVIEW'];

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
      meta_data: r.meta_data,
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
