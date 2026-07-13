import { Prisma } from '@prisma/client';
import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { paginated } from '@admin/utils/pagination';
import { userCard, userCardSelect } from '@admin/utils/format';
import { resolveAdminFile } from '@admin/utils/attachments';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
type BugStatus = (typeof STATUSES)[number];

export interface BugReportListParams {
  page: number;
  limit: number;
  skip: number;
  status?: string;
  userId?: string;
  created?: { gte?: Date; lte?: Date } | undefined;
}

export class BugReportService {
  static async list(p: BugReportListParams): Promise<ServiceResponse> {
    const where: Prisma.BugReportWhereInput = {};
    if (p.status && STATUSES.includes(p.status as BugStatus)) where.status = p.status;
    if (p.userId) where.reporter_id = Number(p.userId);
    if (p.created) where.created_at = p.created;

    const [rows, total] = await Promise.all([
      prisma.bugReport.findMany({
        where,
        include: { reporter: { select: userCardSelect } },
        orderBy: { created_at: 'desc' },
        skip: p.skip,
        take: p.limit,
      }),
      prisma.bugReport.count({ where }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      unique_id: r.unique_id,
      steps: r.steps,
      status: r.status,
      page_url: r.page_url,
      has_recording: !!r.recording_attachment_id,
      recording_duration_seconds: r.recording_duration_seconds,
      created_at: r.created_at,
      reporter: userCard(r.reporter),
    }));
    return { success: true, message: 'OK', data: paginated(items, total, p.page, p.limit) };
  }

  static async getOne(id: number): Promise<ServiceResponse> {
    const r = await prisma.bugReport.findUnique({
      where: { id },
      include: { reporter: { select: userCardSelect } },
    });
    if (!r) return { success: false, message: 'Bug report not found', statusCode: 404 };

    const recording = r.recording_attachment_id
      ? await resolveAdminFile(r.recording_attachment_id)
      : null;

    return {
      success: true,
      message: 'OK',
      data: {
        id: r.id,
        unique_id: r.unique_id,
        steps: r.steps,
        status: r.status,
        admin_note: r.admin_note,
        page_url: r.page_url,
        user_agent: r.user_agent,
        screen_size: r.screen_size,
        recording,
        recording_duration_seconds: r.recording_duration_seconds,
        created_at: r.created_at,
        updated_at: r.updated_at,
        reporter: userCard(r.reporter),
      },
    };
  }

  static async update(
    id: number,
    body: { status?: unknown; admin_note?: unknown }
  ): Promise<ServiceResponse> {
    const report = await prisma.bugReport.findUnique({ where: { id } });
    if (!report) return { success: false, message: 'Bug report not found', statusCode: 404 };

    const data: Prisma.BugReportUpdateInput = {};
    if (body.status !== undefined) {
      const status = String(body.status);
      if (!STATUSES.includes(status as BugStatus)) {
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

    const updated = await prisma.bugReport.update({ where: { id }, data });
    return {
      success: true,
      message: 'Bug report updated',
      data: { id: updated.id, status: updated.status, admin_note: updated.admin_note },
    };
  }
}
