import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '@services/prismaService';
import { ApiResponse } from '@utils/ApiResponse';
import { getPageParams, paginated, getDateRange } from '@admin/utils/pagination';
import { userCard, userCardSelect } from '@admin/utils/format';
import { auditFromReq } from '@admin/services/auditService';

export async function listProjects(req: Request, res: Response) {
  const { page, limit, skip, search } = getPageParams(req);
  const status = req.query.status as string | undefined;

  const where: Prisma.FounderProjectWhereInput = { deleted_at: null };
  if (status) where.status = status;
  if (search) where.project_title = { contains: search, mode: 'insensitive' };
  const created = getDateRange(req);
  if (created) where.created_at = created;

  const [rows, total] = await Promise.all([
    prisma.founderProject.findMany({
      where,
      include: { user: { select: userCardSelect }, category: { select: { name: true } } },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.founderProject.count({ where }),
  ]);

  const items = rows.map((p) => ({
    id: p.id,
    unique_id: p.unique_id,
    title: p.project_title,
    status: p.status,
    budget_currency: p.budget_currency,
    budget_amount: p.budget_amount,
    category: p.category?.name ?? null,
    proposals_count: p.proposals_count,
    hired_count: p.hired_count,
    is_nda_required: p.is_nda_required,
    created_at: p.created_at,
    founder: userCard(p.user),
  }));
  return ApiResponse.success(res, paginated(items, total, page, limit));
}

export async function getProject(req: Request, res: Response) {
  const { uniqueId } = req.params;
  const p = await prisma.founderProject.findUnique({
    where: { unique_id: uniqueId },
    include: {
      user: { select: userCardSelect },
      category: { select: { name: true } },
      subcategory: { select: { name: true } },
      _count: { select: { proposals: true, milestones: true, invites: true } },
    },
  });
  if (!p) return ApiResponse.notFound(res, 'Project not found');

  return ApiResponse.success(res, {
    ...p,
    title: p.project_title,
    founder: userCard(p.user),
    category: p.category?.name ?? null,
    subcategory: p.subcategory?.name ?? null,
  });
}

export async function updateProjectStatus(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { status } = req.body || {};
  if (!status) return ApiResponse.error(res, 'status is required', null, 400);

  const p = await prisma.founderProject.update({ where: { id }, data: { status } });
  await auditFromReq(req, 'project.update_status', { entityType: 'FounderProject', entityId: id, metadata: { status } });
  return ApiResponse.success(res, { id: p.id, status: p.status }, 'Project status updated');
}

export async function takedownProject(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { reason } = req.body || {};

  await prisma.founderProject.update({ where: { id }, data: { deleted_at: new Date() } });
  await auditFromReq(req, 'project.takedown', { entityType: 'FounderProject', entityId: id, description: reason });
  return ApiResponse.success(res, null, 'Project taken down');
}

export async function restoreProject(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);

  await prisma.founderProject.update({ where: { id }, data: { deleted_at: null } });
  await auditFromReq(req, 'project.restore', { entityType: 'FounderProject', entityId: id });
  return ApiResponse.success(res, null, 'Project restored');
}
