import { Request, Response } from 'express';
import { prisma } from '@services/prismaService';
import { ApiResponse } from '@utils/ApiResponse';
import { getPageParams, paginated, getDateRange } from '@admin/utils/pagination';
import { userCard, userCardSelect } from '@admin/utils/format';
import { auditFromReq } from '@admin/services/auditService';

const VALID = ['APPROVED', 'REJECTED', 'UNDER_REVIEW'];

export async function listIdentity(req: Request, res: Response) {
  const { page, limit, skip } = getPageParams(req);
  const status = (req.query.status as string) || undefined;
  const where: Record<string, any> = {};
  if (status) where.status = status;
  const created = getDateRange(req);
  if (created) where.created_at = created;

  const [rows, total] = await Promise.all([
    prisma.identityVerification.findMany({
      where,
      include: { user: { select: userCardSelect } },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
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
  return ApiResponse.success(res, paginated(items, total, page, limit));
}

export async function reviewIdentity(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { status, rejection_reason } = req.body || {};
  if (!VALID.includes(status)) return ApiResponse.error(res, `status must be one of ${VALID.join(', ')}`, null, 400);

  const record = await prisma.identityVerification.findUnique({ where: { id } });
  if (!record) return ApiResponse.notFound(res, 'Verification not found');

  const verified = status === 'APPROVED';
  await prisma.$transaction([
    prisma.identityVerification.update({
      where: { id },
      data: { status, rejection_reason: status === 'REJECTED' ? rejection_reason ?? null : null, verified_at: verified ? new Date() : null },
    }),
    prisma.user.update({
      where: { id: record.user_id },
      data: { identity_verification_status: status, identity_verified_at: verified ? new Date() : null },
    }),
  ]);

  await auditFromReq(req, `verification.identity.${status.toLowerCase()}`, {
    entityType: 'IdentityVerification',
    entityId: id,
    description: rejection_reason,
  });
  return ApiResponse.success(res, null, `Identity verification ${status.toLowerCase()}`);
}

export async function listAgency(req: Request, res: Response) {
  const { page, limit, skip } = getPageParams(req);
  const status = (req.query.status as string) || undefined;
  const where: Record<string, any> = {};
  if (status) where.status = status;
  const created = getDateRange(req);
  if (created) where.created_at = created;

  const [rows, total] = await Promise.all([
    prisma.agencyVerification.findMany({
      where,
      include: { user: { select: userCardSelect } },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.agencyVerification.count({ where }),
  ]);

  const items = rows.map((r) => ({
    id: r.id,
    agency_name: r.agency_name,
    cin: r.cin,
    document_urls: r.document_urls,
    status: r.status,
    submitted_at: r.submitted_at,
    verified_at: r.verified_at,
    verified_by: r.verified_by,
    rejection_reason: r.rejection_reason,
    created_at: r.created_at,
    user: userCard(r.user),
  }));
  return ApiResponse.success(res, paginated(items, total, page, limit));
}

export async function reviewAgency(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { status, rejection_reason } = req.body || {};
  if (!VALID.includes(status)) return ApiResponse.error(res, `status must be one of ${VALID.join(', ')}`, null, 400);

  const record = await prisma.agencyVerification.findUnique({ where: { id } });
  if (!record) return ApiResponse.notFound(res, 'Verification not found');

  const verified = status === 'APPROVED';
  await prisma.$transaction([
    prisma.agencyVerification.update({
      where: { id },
      data: {
        status,
        rejection_reason: status === 'REJECTED' ? rejection_reason ?? null : null,
        verified_at: verified ? new Date() : null,
        verified_by: req.admin!.id,
      },
    }),
    prisma.user.update({
      where: { id: record.user_id },
      data: { agency_verification_status: status, agency_verified_at: verified ? new Date() : null },
    }),
  ]);

  await auditFromReq(req, `verification.agency.${status.toLowerCase()}`, {
    entityType: 'AgencyVerification',
    entityId: id,
    description: rejection_reason,
  });
  return ApiResponse.success(res, null, `Agency verification ${status.toLowerCase()}`);
}
