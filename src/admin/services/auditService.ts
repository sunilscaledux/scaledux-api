import { prisma } from '@services/prismaService';
import { Log } from '@services/loggerService';
import { Request } from 'express';

interface AuditInput {
  adminId?: number | null;
  action: string;
  entityType?: string;
  entityId?: string | number;
  description?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}

/** Best-effort audit write — never throws into the request flow. */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        admin_id: input.adminId ?? null,
        action: input.action,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId != null ? String(input.entityId) : null,
        description: input.description ?? null,
        metadata: (input.metadata as any) ?? undefined,
        ip_address: input.ip ?? null,
      },
    });
  } catch (e) {
    Log.error('Failed to write audit log', { action: input.action, error: (e as Error).message });
  }
}

/** Convenience: pull admin id + ip straight from the request. */
export function auditFromReq(
  req: Request,
  action: string,
  rest: Omit<AuditInput, 'adminId' | 'action' | 'ip'> = {}
) {
  return recordAudit({
    adminId: req.admin?.id ?? null,
    action,
    ip: req.ip,
    ...rest,
  });
}
