import { Prisma } from '@prisma/client';
import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { paginated } from '@admin/utils/pagination';
import { userCard, userCardSelect } from '@admin/utils/format';
import { resolveAdminFiles } from '@admin/utils/attachments';

export interface ProjectListParams {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  status?: string;
  userId?: string;
  created?: Prisma.DateTimeFilter | undefined;
}

export class ProjectService {
  static async list(p: ProjectListParams): Promise<ServiceResponse> {
    const where: Prisma.FounderProjectWhereInput = { deleted_at: null };
    if (p.status) where.status = p.status;
    if (p.userId) where.user_id = Number(p.userId);
    if (p.search) where.project_title = { contains: p.search, mode: 'insensitive' };
    if (p.created) where.created_at = p.created;

    const [rows, total] = await Promise.all([
      prisma.founderProject.findMany({
        where,
        include: { user: { select: userCardSelect }, category: { select: { name: true } } },
        orderBy: { created_at: 'desc' },
        skip: p.skip,
        take: p.limit,
      }),
      prisma.founderProject.count({ where }),
    ]);

    const items = rows.map((row) => ({
      id: row.id,
      unique_id: row.unique_id,
      title: row.project_title,
      status: row.status,
      budget_currency: row.budget_currency,
      budget_amount: row.budget_amount,
      category: row.category?.name ?? null,
      proposals_count: row.proposals_count,
      hired_count: row.hired_count,
      is_nda_required: row.is_nda_required,
      created_at: row.created_at,
      founder: userCard(row.user),
    }));
    return { success: true, message: 'OK', data: paginated(items, total, p.page, p.limit) };
  }

  static async getOne(uniqueId: string): Promise<ServiceResponse> {
    const p = await prisma.founderProject.findUnique({
      where: { unique_id: uniqueId },
      include: {
        user: { select: userCardSelect },
        category: { select: { name: true } },
        subcategory: { select: { name: true } },
        _count: { select: { proposals: true, milestones: true, invites: true } },
      },
    });
    if (!p) return { success: false, message: 'Project not found', statusCode: 404 };

    // All non-draft proposals on this project (received + accepted/hired).
    const proposalRows = await prisma.proposal.findMany({
      where: { project_id: p.id, is_draft: false },
      select: {
        unique_id: true,
        status: true,
        proposed_amount: true,
        created_at: true,
        provider: { select: userCardSelect },
      },
      orderBy: { created_at: 'desc' },
    });
    const proposals = proposalRows.map((pr) => ({
      unique_id: pr.unique_id,
      status: pr.status,
      proposed_amount: pr.proposed_amount != null ? Number(pr.proposed_amount) : null,
      created_at: pr.created_at,
      provider: userCard(pr.provider),
    }));

    return {
      success: true,
      message: 'OK',
      data: {
        ...p,
        title: p.project_title,
        founder: userCard(p.user),
        category: p.category?.name ?? null,
        subcategory: p.subcategory?.name ?? null,
        project_files: await resolveAdminFiles((p as any).project_files),
        proposals,
      },
    };
  }

  static async updateStatus(id: number, status: unknown): Promise<ServiceResponse> {
    if (!status) return { success: false, message: 'status is required', statusCode: 400 };

    const p = await prisma.founderProject.update({ where: { id }, data: { status: status as string } });
    return { success: true, message: 'Project status updated', data: { id: p.id, status: p.status } };
  }

  static async takedown(id: number): Promise<ServiceResponse> {
    await prisma.founderProject.update({ where: { id }, data: { deleted_at: new Date() } });
    return { success: true, message: 'Project taken down' };
  }

  static async restore(id: number): Promise<ServiceResponse> {
    await prisma.founderProject.update({ where: { id }, data: { deleted_at: null } });
    return { success: true, message: 'Project restored' };
  }
}
