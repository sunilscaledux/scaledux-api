import { prisma } from './prismaService'

/**
 * Read helpers for admin-managed option lists stored in the `Constant` table.
 * Only active rows are returned, ordered by sort_order then value. Callers map
 * the rows into whatever shape their public endpoint already exposes. The
 * stored `value` is the canonical text saved on consuming records.
 */

const ORDER = [{ sort_order: 'asc' }, { value: 'asc' }] as const

/** Flat list of values for a group (optionally a subkey-namespaced sub-list). */
export async function getConstantValues(group: string, subkey = ''): Promise<string[]> {
  const rows = await prisma.constant.findMany({
    where: { group, subkey, is_active: true },
    orderBy: ORDER as any,
    select: { value: true },
  })
  return rows.map((r) => r.value)
}

export interface ConstantOption {
  value: string
  label: string
  description: string | null
  code: string | null
}

/** Object-shaped options for a group (investor_type, id_type). label falls back to value. */
export async function getConstantOptions(group: string, subkey = ''): Promise<ConstantOption[]> {
  const rows = await prisma.constant.findMany({
    where: { group, subkey, is_active: true },
    orderBy: ORDER as any,
    select: { value: true, label: true, description: true, code: true },
  })
  return rows.map((r) => ({ value: r.value, label: r.label ?? r.value, description: r.description, code: r.code }))
}

/** True if `value` is an active option in the group (optionally a subkey sub-list). */
export async function isValidConstant(
  group: string,
  value: string | null | undefined,
  subkey = ''
): Promise<boolean> {
  if (value == null || value === '') return false
  const row = await prisma.constant.findFirst({
    where: { group, subkey, value, is_active: true },
    select: { id: true },
  })
  return !!row
}

/** All sub-lists of a group keyed by subkey (e.g. meeting_reason → { CANCEL: [...], ... }). */
export async function getConstantGroupedBySubkey(group: string): Promise<Record<string, string[]>> {
  const rows = await prisma.constant.findMany({
    where: { group, is_active: true },
    orderBy: [{ subkey: 'asc' }, { sort_order: 'asc' }, { value: 'asc' }] as any,
    select: { subkey: true, value: true },
  })
  const out: Record<string, string[]> = {}
  for (const r of rows) {
    ;(out[r.subkey] ||= []).push(r.value)
  }
  return out
}
