import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';

/**
 * Admin management of generic option lists (Constant table).
 * Groups + their sub-lists are admin-managed: add / edit / deactivate / reorder.
 * Consuming records store the option's `value` text, never the row id.
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

export class ConstantService {
  /** List the catalog of groups (for the admin sidebar/picker). */
  static async listGroups(): Promise<ServiceResponse> {
    const counts = await prisma.constant.groupBy({ by: ['group'], _count: { _all: true } });
    const countMap = new Map(counts.map((c) => [c.group, c._count._all]));
    const data = GROUPS.map((g) => ({ ...g, count: countMap.get(g.group) ?? 0 }));
    return { success: true, message: 'Success', data };
  }

  /** List entries within a group, optionally filtered by subkey. Includes inactive (admin view). */
  static async list(group: string, subkey?: string): Promise<ServiceResponse> {
    if (!KNOWN_GROUPS.has(group))
      return { success: false, message: 'Unknown or missing group', statusCode: 400 };
    const rows = await prisma.constant.findMany({
      where: { group, ...(subkey != null ? { subkey } : {}) },
      orderBy: [{ subkey: 'asc' }, { sort_order: 'asc' }, { value: 'asc' }],
    });
    return { success: true, message: 'Success', data: rows };
  }

  static async create(body: {
    group?: unknown;
    subkey?: unknown;
    value?: unknown;
    label?: unknown;
    description?: unknown;
    code?: unknown;
    sort_order?: unknown;
  }): Promise<ServiceResponse> {
    const { group, subkey, value, label, description, code, sort_order } = body;
    if (!group || !KNOWN_GROUPS.has(group as string))
      return { success: false, message: 'Valid group is required', statusCode: 400 };
    if (!value || !String(value).trim())
      return { success: false, message: 'value is required', statusCode: 400 };

    const sk = subkey ? String(subkey) : '';
    // Default sort_order to end of its (group, subkey) list.
    let order = typeof sort_order === 'number' ? sort_order : undefined;
    if (order == null) {
      const max = await prisma.constant.aggregate({
        where: { group: group as string, subkey: sk },
        _max: { sort_order: true },
      });
      order = (max._max.sort_order ?? -1) + 1;
    }

    try {
      const row = await prisma.constant.create({
        data: {
          group: group as string,
          subkey: sk,
          value: String(value).trim(),
          label: (label as string) ?? null,
          description: (description as string) ?? null,
          code: (code as string) ?? null,
          sort_order: order,
        },
      });
      return { success: true, message: 'Option created', data: row, statusCode: 201 };
    } catch (e: any) {
      if (e?.code === 'P2002')
        return { success: false, message: 'That option already exists in this list', statusCode: 409 };
      throw e;
    }
  }

  static async update(
    id: number,
    body: {
      value?: unknown;
      label?: unknown;
      description?: unknown;
      code?: unknown;
      sort_order?: unknown;
      is_active?: unknown;
    }
  ): Promise<ServiceResponse> {
    const { value, label, description, code, sort_order, is_active } = body;
    try {
      const row = await prisma.constant.update({
        where: { id },
        data: {
          ...(value != null ? { value: String(value).trim() } : {}),
          ...(label !== undefined ? { label: (label as string) ?? null } : {}),
          ...(description !== undefined ? { description: (description as string) ?? null } : {}),
          ...(code !== undefined ? { code: (code as string) ?? null } : {}),
          ...(typeof sort_order === 'number' ? { sort_order } : {}),
          ...(typeof is_active === 'boolean' ? { is_active } : {}),
        },
      });
      return { success: true, message: 'Option updated', data: row };
    } catch (e: any) {
      if (e?.code === 'P2002')
        return { success: false, message: 'That value already exists in this list', statusCode: 409 };
      if (e?.code === 'P2025') return { success: false, message: 'Option not found', statusCode: 404 };
      throw e;
    }
  }

  /** Persist a new ordering for a set of ids (admin drag-to-reorder). */
  static async reorder(ids: unknown): Promise<ServiceResponse> {
    if (!Array.isArray(ids) || ids.some((i) => typeof i !== 'number')) {
      return { success: false, message: 'ids (number[]) is required', statusCode: 400 };
    }
    await prisma.$transaction(
      ids.map((id: number, index: number) =>
        prisma.constant.update({ where: { id }, data: { sort_order: index } })
      )
    );
    return { success: true, message: 'Order updated', data: { count: ids.length } };
  }
}
