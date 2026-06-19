import { Prisma } from '@prisma/client';
import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { paginated } from '@admin/utils/pagination';
import { userCard, userCardSelect } from '@admin/utils/format';
import { resolveAdminFile, resolveAdminFiles } from '@admin/utils/attachments';

export interface ProposalListParams {
  page: number;
  limit: number;
  skip: number;
  status?: string;
  userId?: string;
  created?: Prisma.DateTimeFilter | undefined;
}

export class ProposalService {
  static async list(p: ProposalListParams): Promise<ServiceResponse> {
    const where: Prisma.ProposalWhereInput = { is_draft: false };
    if (p.status) where.status = p.status;
    if (p.userId) where.provider_id = Number(p.userId);
    if (p.created) where.created_at = p.created;

    const [rows, total] = await Promise.all([
      prisma.proposal.findMany({
        where,
        include: {
          provider: { select: userCardSelect },
          project: { select: { unique_id: true, project_title: true } },
          proposalNda: { select: { is_nda_signed: true, nda_sent_at: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: p.skip,
        take: p.limit,
      }),
      prisma.proposal.count({ where }),
    ]);

    const items = rows.map((row) => ({
      id: row.id,
      unique_id: row.unique_id,
      status: row.status,
      proposed_amount: Number(row.proposed_amount),
      payment_schedule: row.payment_schedule,
      created_at: row.created_at,
      terminate_at: row.terminate_at,
      nda_signed: row.proposalNda?.is_nda_signed ?? false,
      provider: userCard(row.provider),
      project: row.project ? { unique_id: row.project.unique_id, title: row.project.project_title } : null,
    }));
    return { success: true, message: 'OK', data: paginated(items, total, p.page, p.limit) };
  }

  static async getOne(uniqueId: string): Promise<ServiceResponse> {
    const p = await prisma.proposal.findUnique({
      where: { unique_id: uniqueId },
      include: {
        provider: { select: userCardSelect },
        project: { include: { user: { select: userCardSelect } } },
        milestonesRows: { orderBy: { order_index: 'asc' }, include: { deliverablesRow: { orderBy: { order_index: 'asc' } } } },
        proposalNda: true,
      },
    });
    if (!p) return { success: false, message: 'Proposal not found', statusCode: 404 };

    const [attachments, ndaFile, ndaSignedFile, milestones] = await Promise.all([
      resolveAdminFiles(p.attachments),
      resolveAdminFile(p.proposalNda?.nda_file_link ?? null),
      resolveAdminFile(p.proposalNda?.nda_signed_file_link ?? null),
      Promise.all(
        p.milestonesRows.map(async (m) => ({
          ...m,
          amount: Number(m.amount),
          deliverables: await Promise.all(
            ((m as any).deliverablesRow ?? []).map(async (d: any) => ({
              id: d.id,
              description: d.description,
              status: d.status,
              submitted_at: d.submitted_at,
              submitted_remark: d.submitted_remark,
              files: await resolveAdminFiles(d.submitted_file),
            }))
          ),
        }))
      ),
    ]);

    return {
      success: true,
      message: 'OK',
      data: {
        ...p,
        proposed_amount: Number(p.proposed_amount),
        provider: userCard(p.provider),
        project: p.project ? { ...p.project, title: p.project.project_title, founder: userCard(p.project.user) } : null,
        milestones,
        attachments,
        proposalNda: p.proposalNda ? { ...p.proposalNda, nda_file: ndaFile, nda_signed_file: ndaSignedFile } : null,
      },
    };
  }

  static async terminate(id: number, adminId: number, reason?: unknown): Promise<ServiceResponse> {
    const p = await prisma.proposal.update({
      where: { id },
      data: { status: 'TERMINATED', terminate_at: new Date(), terminate_by: adminId, founder_remark: (reason as string) ?? null },
    });
    return { success: true, message: 'Proposal terminated', data: { id: p.id, status: p.status } };
  }

  static async updateStatus(id: number, status: unknown): Promise<ServiceResponse> {
    if (!status) return { success: false, message: 'status is required', statusCode: 400 };

    const p = await prisma.proposal.update({ where: { id }, data: { status: status as string } });
    return { success: true, message: 'Proposal status updated', data: { id: p.id, status: p.status } };
  }

  /** Activity timeline for a proposal (from the generic scd_activities log). */
  static async getActivity(uniqueId: string): Promise<ServiceResponse> {
    const proposal = await prisma.proposal.findUnique({
      where: { unique_id: uniqueId },
      select: { unique_id: true },
    });
    if (!proposal) return { success: false, message: 'Proposal not found', statusCode: 404 };

    const activities = await prisma.activity.findMany({
      where: { subject_type: 'Proposal', subject_unique_id: proposal.unique_id },
      orderBy: { created_at: 'desc' },
      take: 200,
    });

    const actorIds = [...new Set(activities.map((a) => a.created_by_user_id))];
    const actors = actorIds.length
      ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: userCardSelect })
      : [];
    const actorMap = new Map(actors.map((u) => [u.id, userCard(u)]));

    const items = activities.map((a) => ({
      id: a.id,
      type: a.type,
      payload: a.payload,
      created_at: a.created_at,
      actor: actorMap.get(a.created_by_user_id) ?? { id: a.created_by_user_id },
    }));
    return { success: true, message: 'OK', data: items };
  }

  /** The conversation/chat between the proposal's provider and the project founder. */
  static async getChat(uniqueId: string): Promise<ServiceResponse> {
    const proposal = await prisma.proposal.findUnique({
      where: { unique_id: uniqueId },
      include: { project: { select: { user_id: true } } },
    });
    if (!proposal) return { success: false, message: 'Proposal not found', statusCode: 404 };

    const a = proposal.provider_id;
    const b = proposal.project.user_id;
    const user1_id = Math.min(a, b);
    const user2_id = Math.max(a, b);

    const conversation = await prisma.conversation.findUnique({
      where: { user1_id_user2_id: { user1_id, user2_id } },
      include: { user1: { select: userCardSelect }, user2: { select: userCardSelect } },
    });
    if (!conversation) {
      return { success: true, message: 'No conversation yet', data: { conversation: null, messages: [] } };
    }

    const messages = await prisma.message.findMany({
      where: { conversation_id: conversation.id },
      orderBy: { created_at: 'asc' },
      take: 500,
      include: { sender: { select: userCardSelect } },
    });

    return {
      success: true,
      message: 'Success',
      data: {
        conversation: {
          id: conversation.id,
          unique_id: conversation.unique_id,
          user1: userCard(conversation.user1),
          user2: userCard(conversation.user2),
        },
        messages: messages.map((m) => ({
          id: m.id,
          type: m.type,
          content: m.content,
          metadata: m.metadata,
          created_at: m.created_at,
          sender: m.sender ? userCard(m.sender) : null,
        })),
      },
    };
  }
}
