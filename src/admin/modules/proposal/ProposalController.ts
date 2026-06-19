import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { getPageParams, getDateRange } from '@admin/utils/pagination';
import { auditFromReq } from '@admin/services/auditService';
import { ProposalService } from './ProposalService';

export async function listProposals(req: Request, res: Response) {
  const { page, limit, skip } = getPageParams(req);
  const result = await ProposalService.list({
    page,
    limit,
    skip,
    status: req.query.status as string | undefined,
    userId: req.query.userId as string | undefined,
    created: getDateRange(req),
  });
  return ApiResponse.success(res, result.data);
}

export async function getProposal(req: Request, res: Response) {
  const { uniqueId } = req.params;
  const result = await ProposalService.getOne(uniqueId);
  if (!result.success) return ApiResponse.notFound(res, result.message);
  return ApiResponse.success(res, result.data);
}

export async function terminateProposal(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { reason } = req.body || {};
  const result = await ProposalService.terminate(id, req.admin!.id, reason);
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'proposal.terminate', { entityType: 'Proposal', entityId: id, description: reason });
  return ApiResponse.success(res, result.data, result.message);
}

export async function updateProposalStatus(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { status } = req.body || {};
  const result = await ProposalService.updateStatus(id, status);
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'proposal.update_status', { entityType: 'Proposal', entityId: id, metadata: { status } });
  return ApiResponse.success(res, result.data, result.message);
}

/** Activity timeline for a proposal (from the generic scd_activities log). */
export async function getProposalActivity(req: Request, res: Response) {
  const { uniqueId } = req.params;
  const result = await ProposalService.getActivity(uniqueId);
  if (!result.success) return ApiResponse.notFound(res, result.message);
  return ApiResponse.success(res, result.data);
}

/** The conversation/chat between the proposal's provider and the project founder. */
export async function getProposalChat(req: Request, res: Response) {
  const { uniqueId } = req.params;
  const result = await ProposalService.getChat(uniqueId);
  if (!result.success) return ApiResponse.notFound(res, result.message);
  return ApiResponse.success(res, result.data, result.message);
}
