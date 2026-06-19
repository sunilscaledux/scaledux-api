import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '@services/prismaService';
import { ApiResponse } from '@utils/ApiResponse';
import { getPageParams, paginated, getDateRange } from '@admin/utils/pagination';
import { userCard, userCardSelect } from '@admin/utils/format';
import { auditFromReq } from '@admin/services/auditService';

export async function listProposals(req: Request, res: Response) {
  const { page, limit, skip } = getPageParams(req);
  const status = req.query.status as string | undefined;

  const where: Prisma.ProposalWhereInput = { is_draft: false };
  if (status) where.status = status;
  const created = getDateRange(req);
  if (created) where.created_at = created;

  const [rows, total] = await Promise.all([
    prisma.proposal.findMany({
      where,
      include: {
        provider: { select: userCardSelect },
        project: { select: { unique_id: true, project_title: true } },
        proposalNda: { select: { is_nda_signed: true, nda_sent_at: true } },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.proposal.count({ where }),
  ]);

  const items = rows.map((p) => ({
    id: p.id,
    unique_id: p.unique_id,
    status: p.status,
    proposed_amount: Number(p.proposed_amount),
    payment_schedule: p.payment_schedule,
    created_at: p.created_at,
    terminate_at: p.terminate_at,
    nda_signed: p.proposalNda?.is_nda_signed ?? false,
    provider: userCard(p.provider),
    project: p.project ? { unique_id: p.project.unique_id, title: p.project.project_title } : null,
  }));
  return ApiResponse.success(res, paginated(items, total, page, limit));
}

export async function getProposal(req: Request, res: Response) {
  const { uniqueId } = req.params;
  const p = await prisma.proposal.findUnique({
    where: { unique_id: uniqueId },
    include: {
      provider: { select: userCardSelect },
      project: { include: { user: { select: userCardSelect } } },
      milestonesRows: { orderBy: { order_index: 'asc' } },
      proposalNda: true,
    },
  });
  if (!p) return ApiResponse.notFound(res, 'Proposal not found');

  return ApiResponse.success(res, {
    ...p,
    proposed_amount: Number(p.proposed_amount),
    provider: userCard(p.provider),
    project: p.project ? { ...p.project, title: p.project.project_title, founder: userCard(p.project.user) } : null,
    milestones: p.milestonesRows.map((m) => ({ ...m, amount: Number(m.amount) })),
  });
}

export async function terminateProposal(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { reason } = req.body || {};

  const p = await prisma.proposal.update({
    where: { id },
    data: { status: 'TERMINATED', terminate_at: new Date(), terminate_by: req.admin!.id, founder_remark: reason ?? null },
  });
  await auditFromReq(req, 'proposal.terminate', { entityType: 'Proposal', entityId: id, description: reason });
  return ApiResponse.success(res, { id: p.id, status: p.status }, 'Proposal terminated');
}

export async function updateProposalStatus(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { status } = req.body || {};
  if (!status) return ApiResponse.error(res, 'status is required', null, 400);

  const p = await prisma.proposal.update({ where: { id }, data: { status } });
  await auditFromReq(req, 'proposal.update_status', { entityType: 'Proposal', entityId: id, metadata: { status } });
  return ApiResponse.success(res, { id: p.id, status: p.status }, 'Proposal status updated');
}

/** Activity timeline for a proposal (from the generic scd_activities log). */
export async function getProposalActivity(req: Request, res: Response) {
  const { uniqueId } = req.params;
  const proposal = await prisma.proposal.findUnique({
    where: { unique_id: uniqueId },
    select: { unique_id: true },
  });
  if (!proposal) return ApiResponse.notFound(res, 'Proposal not found');

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
  return ApiResponse.success(res, items);
}

/** The conversation/chat between the proposal's provider and the project founder. */
export async function getProposalChat(req: Request, res: Response) {
  const { uniqueId } = req.params;
  const proposal = await prisma.proposal.findUnique({
    where: { unique_id: uniqueId },
    include: { project: { select: { user_id: true } } },
  });
  if (!proposal) return ApiResponse.notFound(res, 'Proposal not found');

  const a = proposal.provider_id;
  const b = proposal.project.user_id;
  const user1_id = Math.min(a, b);
  const user2_id = Math.max(a, b);

  const conversation = await prisma.conversation.findUnique({
    where: { user1_id_user2_id: { user1_id, user2_id } },
    include: { user1: { select: userCardSelect }, user2: { select: userCardSelect } },
  });
  if (!conversation) {
    return ApiResponse.success(res, { conversation: null, messages: [] }, 'No conversation yet');
  }

  const messages = await prisma.message.findMany({
    where: { conversation_id: conversation.id },
    orderBy: { created_at: 'asc' },
    take: 500,
    include: { sender: { select: userCardSelect } },
  });

  return ApiResponse.success(res, {
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
  });
}
