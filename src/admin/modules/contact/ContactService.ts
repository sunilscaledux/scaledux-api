import { Prisma } from '@prisma/client';
import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { paginated } from '@admin/utils/pagination';

const STATUSES = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'] as const;
type ContactStatus = (typeof STATUSES)[number];

export interface ContactListParams {
  page: number;
  limit: number;
  skip: number;
  status?: string;
  reason?: string;
  search?: string;
  created?: { gte?: Date; lte?: Date } | undefined;
}

export class ContactService {
  static async list(p: ContactListParams): Promise<ServiceResponse> {
    const where: Prisma.ContactSubmissionWhereInput = {};
    if (p.status && STATUSES.includes(p.status as ContactStatus)) where.status = p.status;
    if (p.reason) where.reason = p.reason;
    if (p.created) where.created_at = p.created;
    if (p.search) {
      const q = p.search.trim();
      where.OR = [
        { first_name: { contains: q, mode: 'insensitive' } },
        { last_name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.contactSubmission.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: p.skip,
        take: p.limit,
      }),
      prisma.contactSubmission.count({ where }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      unique_id: r.unique_id,
      name: `${r.first_name} ${r.last_name}`.trim(),
      email: r.email,
      reason: r.reason,
      subject: r.subject,
      status: r.status,
      created_at: r.created_at,
    }));
    return { success: true, message: 'OK', data: paginated(items, total, p.page, p.limit) };
  }

  static async getOne(id: number): Promise<ServiceResponse> {
    const r = await prisma.contactSubmission.findUnique({ where: { id } });
    if (!r) return { success: false, message: 'Contact submission not found', statusCode: 404 };

    return {
      success: true,
      message: 'OK',
      data: {
        id: r.id,
        unique_id: r.unique_id,
        first_name: r.first_name,
        last_name: r.last_name,
        name: `${r.first_name} ${r.last_name}`.trim(),
        email: r.email,
        phone: r.phone,
        reason: r.reason,
        subject: r.subject,
        message: r.message,
        status: r.status,
        admin_note: r.admin_note,
        created_at: r.created_at,
        updated_at: r.updated_at,
      },
    };
  }

  static async update(
    id: number,
    body: { status?: unknown; admin_note?: unknown }
  ): Promise<ServiceResponse> {
    const existing = await prisma.contactSubmission.findUnique({ where: { id } });
    if (!existing) return { success: false, message: 'Contact submission not found', statusCode: 404 };

    const data: Prisma.ContactSubmissionUpdateInput = {};
    if (body.status !== undefined) {
      const status = String(body.status);
      if (!STATUSES.includes(status as ContactStatus)) {
        return { success: false, message: `Status must be one of: ${STATUSES.join(', ')}`, statusCode: 400 };
      }
      data.status = status;
    }
    if (body.admin_note !== undefined) {
      data.admin_note = body.admin_note === '' ? null : String(body.admin_note).slice(0, 5000);
    }
    if (Object.keys(data).length === 0) {
      return { success: false, message: 'Nothing to update', statusCode: 400 };
    }

    const updated = await prisma.contactSubmission.update({ where: { id }, data });
    return {
      success: true,
      message: 'Contact submission updated',
      data: { id: updated.id, status: updated.status, admin_note: updated.admin_note },
    };
  }
}
