import { Request, Response } from 'express';
import { prisma } from '@services/prismaService';
import { ApiResponse } from '@utils/ApiResponse';
import { auditFromReq } from '@admin/services/auditService';

/**
 * Admin management of generic option lists (Constant table).
 * Groups + their sub-lists are admin-managed: add / edit / deactivate / reorder.
 * Consuming records store the option's `value` text — never the row id.
 */

/** Human-friendly labels + which groups use a subkey (sub-list). Drives the admin UI. */
const GROUPS: { group: string; label: string; subkeyed: boolean; objectShaped?: boolean }[] = [
  { group: 'proposal_reason', label: 'Proposal / Offer Reasons', subkeyed: true },
  { group: 'meeting_reason', label: 'Meeting / Booking Reasons', subkeyed: true },
  { group: 'contract_end_reason', label: 'Contract End Reasons', subkeyed: false },
  { group: 'startup_stage', label: 'Startup Stages', subkeyed: false },
  { group: 'funding_stage', label: 'Funding Stages', subkeyed: false },
  { group: 'revenue_model', label: 'Revenue Models', subkeyed: false },
  { group: 'investment_criteria', label: 'Investment Criteria', subkeyed: false },
  { group: 'investor_type', label: 'Investor Types', subkeyed: false, objectShaped: true },
  { group: 'id_type', label: 'ID Types', subkeyed: false, objectShaped: true },
];

const KNOWN_GROUPS = new Set(GROUPS.map((g) => g.group));

/** List the catalog of groups (for the admin sidebar/picker). */
export async function listGroups(_req: Request, res: Response) {
  const counts = await prisma.constant.groupBy({ by: ['group'], _count: { _all: true } });
  const countMap = new Map(counts.map((c) => [c.group, c._count._all]));
  const data = GROUPS.map((g) => ({ ...g, count: countMap.get(g.group) ?? 0 }));
  return ApiResponse.success(res, data);
}

/** List entries within a group, optionally filtered by subkey. Includes inactive (admin view). */
export async function listConstants(req: Request, res: Response) {
  const group = String(req.query.group || '');
  if (!KNOWN_GROUPS.has(group)) return ApiResponse.error(res, 'Unknown or missing group', null, 400);
  const subkey = req.query.subkey != null ? String(req.query.subkey) : undefined;
  const rows = await prisma.constant.findMany({
    where: { group, ...(subkey != null ? { subkey } : {}) },
    orderBy: [{ subkey: 'asc' }, { sort_order: 'asc' }, { value: 'asc' }],
  });
  return ApiResponse.success(res, rows);
}

export async function createConstant(req: Request, res: Response) {
  const { group, subkey, value, label, description, code, sort_order } = req.body || {};
  if (!group || !KNOWN_GROUPS.has(group)) return ApiResponse.error(res, 'Valid group is required', null, 400);
  if (!value || !String(value).trim()) return ApiResponse.error(res, 'value is required', null, 400);

  const sk = subkey ? String(subkey) : '';
  // Default sort_order to end of its (group, subkey) list.
  let order = typeof sort_order === 'number' ? sort_order : undefined;
  if (order == null) {
    const max = await prisma.constant.aggregate({
      where: { group, subkey: sk },
      _max: { sort_order: true },
    });
    order = (max._max.sort_order ?? -1) + 1;
  }

  try {
    const row = await prisma.constant.create({
      data: {
        group,
        subkey: sk,
        value: String(value).trim(),
        label: label ?? null,
        description: description ?? null,
        code: code ?? null,
        sort_order: order,
      },
    });
    await auditFromReq(req, 'constant.create', { entityType: 'Constant', entityId: row.id });
    return ApiResponse.created(res, row, 'Option created');
  } catch (e: any) {
    if (e?.code === 'P2002') return ApiResponse.error(res, 'That option already exists in this list', null, 409);
    throw e;
  }
}

export async function updateConstant(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { value, label, description, code, sort_order, is_active } = req.body || {};

  try {
    const row = await prisma.constant.update({
      where: { id },
      data: {
        ...(value != null ? { value: String(value).trim() } : {}),
        ...(label !== undefined ? { label: label ?? null } : {}),
        ...(description !== undefined ? { description: description ?? null } : {}),
        ...(code !== undefined ? { code: code ?? null } : {}),
        ...(typeof sort_order === 'number' ? { sort_order } : {}),
        ...(typeof is_active === 'boolean' ? { is_active } : {}),
      },
    });
    await auditFromReq(req, 'constant.update', { entityType: 'Constant', entityId: id });
    return ApiResponse.success(res, row, 'Option updated');
  } catch (e: any) {
    if (e?.code === 'P2002') return ApiResponse.error(res, 'That value already exists in this list', null, 409);
    if (e?.code === 'P2025') return ApiResponse.notFound(res, 'Option not found');
    throw e;
  }
}

/** Persist a new ordering for a set of ids (admin drag-to-reorder). */
export async function reorderConstants(req: Request, res: Response) {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || ids.some((i) => typeof i !== 'number')) {
    return ApiResponse.error(res, 'ids (number[]) is required', null, 400);
  }
  await prisma.$transaction(
    ids.map((id: number, index: number) =>
      prisma.constant.update({ where: { id }, data: { sort_order: index } })
    )
  );
  await auditFromReq(req, 'constant.reorder', { entityType: 'Constant', metadata: { count: ids.length } });
  return ApiResponse.success(res, null, 'Order updated');
}
