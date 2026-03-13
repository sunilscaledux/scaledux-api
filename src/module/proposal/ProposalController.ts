import { Request, Response } from "express";
import { ProposalService } from "./ProposalService";
import { ApiResponse } from "@utils/ApiResponse";
import { calculateProfileCompletion } from "../profile/ProfileCompletionService";

/**
 * Get helper for safe string params
 */
function getStringParam(param: any): string {
  return typeof param === 'string' ? param : '';
}

const DEFAULT_PROPOSAL_PAGE_LIMIT = Number(process.env.PROPOSAL_PAGE_LIMIT) || 50;
const MIN_PROFILE_COMPLETION_PERCENT = Number(process.env.MIN_PROFILE_COMPLETION_PERCENT) || 50;

/**
 * Create a new proposal
 */
export async function createProposal(req: Request, res: Response) {
  const userId = req.user?.id;
  const { 
    projectId, 
    cover_letter, 
    proposed_amount, 
    payment_schedule, 
    hours_required,
    screening_answers,
    attachments 
  } = req.body;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!projectId) {
    return ApiResponse.error(res, "Project ID is required", 400);
  }

  if (!proposed_amount || proposed_amount <= 0) {
    return ApiResponse.error(res, "Valid proposed amount is required", 400);
  }

  try {
    const completion = await calculateProfileCompletion(userId);
    if (completion.totalPercentage < MIN_PROFILE_COMPLETION_PERCENT) {
      return ApiResponse.error(
        res,
        `Complete your profile to submit a proposal. Your profile is ${completion.totalPercentage}% complete; at least ${MIN_PROFILE_COMPLETION_PERCENT}% is required.`,
        400
      );
    }
  } catch (err) {
    console.error("Profile completion check failed:", err);
    return ApiResponse.error(res, "Unable to verify profile completion", 500);
  }

  const result = await ProposalService.createProposal(userId, projectId, {
    cover_letter,
    proposed_amount: parseFloat(proposed_amount),
    payment_schedule: payment_schedule || 'byProject',
    hours_required: hours_required != null ? (typeof hours_required === 'number' ? hours_required : parseFloat(hours_required)) : undefined,
    screening_answers: screening_answers || [],
    attachments: attachments || []
  });

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message, 201);
  } else {
    const statusCode = result.message?.includes("already submitted") ? 409 : 400;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Get my proposals (service provider)
 */
export async function getMyProposals(req: Request, res: Response) {
  const userId = req.user?.id;
  const { status, page, limit } = req.query;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  const result = await ProposalService.getMyProposals(
    userId,
    status as string,
    parseInt(page as string) || 1,
    parseInt(limit as string) || DEFAULT_PROPOSAL_PAGE_LIMIT
  );

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message, 500);
  }
}

/**
 * Get proposals for a project (founder)
 */
export async function getProposalsByProject(req: Request, res: Response) {
  const userId = req.user?.id;
  const projectId = getStringParam(req.params.projectId);
  const { status, page, limit } = req.query;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!projectId) {
    return ApiResponse.error(res, "Project ID is required", 400);
  }

  const result = await ProposalService.getProposalsByProject(
    userId,
    projectId,
    status as string,
    parseInt(page as string) || 1,
    parseInt(limit as string) || DEFAULT_PROPOSAL_PAGE_LIMIT
  );

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message?.includes("not found") ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Get founder's contracts by status (ACCEPTED, OFFER_SENT, OFFER_ACCEPTED, HIRED, TERMINATING, REJECTED, TERMINATED, WITHDRAWN).
 */
export async function getFounderContracts(req: Request, res: Response) {
  const userId = req.user?.id;
  const { status, page, limit } = req.query;
  const { ProposalStatus } = await import('@constants/status');
  const validStatuses = [ProposalStatus.ACCEPTED, ProposalStatus.OFFER_SENT, ProposalStatus.OFFER_ACCEPTED, ProposalStatus.HIRED, ProposalStatus.TERMINATING, ProposalStatus.REJECTED, ProposalStatus.TERMINATED, ProposalStatus.WITHDRAWN];
  const statusParam = typeof status === 'string' ? status : '';

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!validStatuses.includes(statusParam)) {
    return ApiResponse.error(res, "status must be one of ACCEPTED, OFFER_SENT, OFFER_ACCEPTED, HIRED, TERMINATING, REJECTED, TERMINATED, WITHDRAWN", 400);
  }

  const result = await ProposalService.getFounderContracts(
    userId,
    statusParam as 'ACCEPTED' | 'OFFER_SENT' | 'OFFER_ACCEPTED' | 'HIRED' | 'TERMINATING' | 'REJECTED' | 'TERMINATED' | 'WITHDRAWN',
    parseInt(page as string) || 1,
    parseInt(limit as string) || DEFAULT_PROPOSAL_PAGE_LIMIT
  );

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message, 500);
  }
}

/**
 * Get a single proposal by ID
 */
export async function getProposalById(req: Request, res: Response) {
  const userId = req.user?.id;
  const proposalId = getStringParam(req.params.id);

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!proposalId) {
    return ApiResponse.error(res, "Proposal ID is required", 400);
  }

  const result = await ProposalService.getProposalById(userId, proposalId);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    let statusCode = 500;
    if (result.message?.includes("not found")) statusCode = 404;
    if (result.message?.includes("permission")) statusCode = 403;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Update proposal content (service provider, PENDING only)
 */
export async function updateProposal(req: Request, res: Response) {
  const userId = req.user?.id;
  const proposalId = getStringParam(req.params.id);
  const {
    cover_letter,
    proposed_amount,
    payment_schedule,
    hours_required,
    milestones,
    screening_answers,
    attachments
  } = req.body;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!proposalId) {
    return ApiResponse.error(res, "Proposal ID is required", 400);
  }

  if (proposed_amount == null || proposed_amount <= 0) {
    return ApiResponse.error(res, "Valid proposed amount is required", 400);
  }

  try {
    const completion = await calculateProfileCompletion(userId);
    if (completion.totalPercentage < MIN_PROFILE_COMPLETION_PERCENT) {
      return ApiResponse.error(
        res,
        `Complete your profile to submit a proposal. Your profile is ${completion.totalPercentage}% complete; at least ${MIN_PROFILE_COMPLETION_PERCENT}% is required.`,
        400
      );
    }
  } catch (err) {
    console.error("Profile completion check failed:", err);
    return ApiResponse.error(res, "Unable to verify profile completion", 500);
  }

  const result = await ProposalService.updateProposal(userId, proposalId, {
    cover_letter,
    proposed_amount: parseFloat(proposed_amount),
    payment_schedule: payment_schedule || 'byProject',
    hours_required: hours_required != null ? (typeof hours_required === 'number' ? hours_required : parseFloat(hours_required)) : undefined,
    milestones: milestones || [],
    screening_answers: screening_answers || [],
    attachments: attachments || []
  });

  if (result.success) {
    return ApiResponse.success(res, null, result.message);
  } else {
    const statusCode = result.message?.includes("not found") || result.message?.includes("permission") ? 403 : 400;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Add a new milestone (freelancer only, OFFER_ACCEPTED or HIRED)
 */
export async function addMilestone(req: Request, res: Response) {
  const userId = req.user?.id;
  const proposalId = getStringParam(req.params.id);
  const { title, description, amount, dueDate, deliverables, remark } = req.body ?? {};

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }
  if (!proposalId) {
    return ApiResponse.error(res, "Proposal ID is required", 400);
  }
  const titleStr = typeof title === "string" ? title.trim() : "";
  if (!titleStr) {
    return ApiResponse.error(res, "Milestone title is required", 400);
  }
  const amt = Number(amount);
  if (isNaN(amt) || amt < 0) {
    return ApiResponse.error(res, "Valid amount is required", 400);
  }
  const dlvs = Array.isArray(deliverables)
    ? deliverables.map((d: any) => ({ deliverable: typeof d?.deliverable === "string" ? d.deliverable : String(d ?? "") }))
    : [];

  const result = await ProposalService.addMilestone(userId, proposalId, {
    title: titleStr,
    description: description != null ? String(description) : null,
    amount: amt,
    dueDate: dueDate != null ? new Date(dueDate) : null,
    deliverables: dlvs,
    remark: typeof remark === "string" ? remark : undefined
  });

  if (result.success) {
    return ApiResponse.success(res, null, result.message);
  }
  const code = result.message?.includes("not found") || result.message?.includes("permission") ? 403 : 400;
  return ApiResponse.error(res, result.message, code);
}

/**
 * Update proposal status (founder)
 */
export async function updateProposalStatus(req: Request, res: Response) {
  const userId = req.user?.id;
  const proposalId = getStringParam(req.params.id);
  const { status, reason } = req.body;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!proposalId) {
    return ApiResponse.error(res, "Proposal ID is required", 400);
  }

  if (!status || !['ACCEPTED', 'REJECTED'].includes(status)) {
    return ApiResponse.error(res, "Valid status (ACCEPTED or REJECTED) is required", 400);
  }

  const rejectionReason = status === 'REJECTED' ? (typeof reason === 'string' ? reason.trim() : '') : undefined;
  if (status === 'REJECTED' && !rejectionReason) {
    return ApiResponse.error(res, "Reason for rejection is required", 400);
  }

  const result = await ProposalService.updateProposalStatus(userId, proposalId, status, rejectionReason);

  if (result.success) {
    return ApiResponse.success(res, null, result.message);
  } else {
    let statusCode = 500;
    if (result.message?.includes("not found")) statusCode = 404;
    if (result.message?.includes("permission")) statusCode = 403;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Set hire (founder). Sets proposal status to HIRED when NDA is signed (OFFER_ACCEPTED).
 */
export async function setHire(req: Request, res: Response) {
  const userId = req.user?.id;
  const proposalId = getStringParam(req.params.id);

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!proposalId) {
    return ApiResponse.error(res, "Proposal ID is required", 400);
  }

  const result = await ProposalService.setHire(userId, proposalId);

  if (result.success) {
    return ApiResponse.success(res, null, result.message);
  } else {
    const statusCode = result.message?.includes("not found") ? 404 : result.message?.includes("Only the project owner") ? 403 : 400;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Cancel hire / withdraw offer (founder). Allowed only when ACCEPTED and NDA not signed.
 */
export async function cancelHire(req: Request, res: Response) {
  const userId = req.user?.id;
  const proposalId = getStringParam(req.params.id);
  const body = req.body as { reason?: string };

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!proposalId) {
    return ApiResponse.error(res, "Proposal ID is required", 400);
  }

  const result = await ProposalService.cancelHire(userId, proposalId, body);

  if (result.success) {
    return ApiResponse.success(res, null, result.message);
  } else {
    let statusCode = 500;
    if (result.message?.includes("not found")) statusCode = 404;
    if (result.message?.includes("permission") || result.message?.includes("Only the project owner")) statusCode = 403;
    if (result.message?.includes("Cannot withdraw")) statusCode = 400;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Decline offer (freelancer only). Allowed only when status is OFFER_SENT. Optional reason; syncs to chat.
 */
export async function declineOffer(req: Request, res: Response) {
  const userId = req.user?.id;
  const proposalId = getStringParam(req.params.id);
  const body = (req.body || {}) as { reason?: string };

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!proposalId) {
    return ApiResponse.error(res, "Proposal ID is required", 400);
  }

  const result = await ProposalService.declineOffer(userId, proposalId, body);

  if (result.success) {
    return ApiResponse.success(res, null, result.message);
  } else {
    const statusCode = result.message?.includes("not found") ? 404 : result.message?.includes("Only the freelancer") ? 403 : 400;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Terminate contract (founder or freelancer). Only when status is HIRED. Requires reason; syncs to chat.
 */
export async function terminateContract(req: Request, res: Response) {
  const userId = req.user?.id;
  const proposalId = getStringParam(req.params.id);
  const { reason } = req.body as { reason?: string };

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!proposalId) {
    return ApiResponse.error(res, "Proposal ID is required", 400);
  }

  const result = await ProposalService.terminateContract(userId, proposalId, reason ?? "");

  if (result.success) {
    return ApiResponse.success(res, null, result.message);
  } else {
    const statusCode = result.message?.includes("not found") ? 404 : result.message?.includes("permission") ? 403 : 400;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Restore contract: cancel scheduled termination (clear terminate_at). Founder or freelancer, HIRED only.
 */
export async function restoreContract(req: Request, res: Response) {
  const userId = req.user?.id;
  const proposalId = getStringParam(req.params.id);

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }
  if (!proposalId) {
    return ApiResponse.error(res, "Proposal ID is required", 400);
  }

  const result = await ProposalService.restoreContract(userId, proposalId);

  if (result.success) {
    return ApiResponse.success(res, null, result.message);
  } else {
    const statusCode = result.message?.includes("not found") ? 404 : result.message?.includes("permission") ? 403 : 400;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Mark project completed (founder). Allowed when HIRED and all milestones PAID/COMPLETED.
 */
export async function markProjectCompleted(req: Request, res: Response) {
  const userId = req.user?.id;
  const proposalId = getStringParam(req.params.id);

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }
  if (!proposalId) {
    return ApiResponse.error(res, "Proposal ID is required", 400);
  }

  const result = await ProposalService.markProjectCompleted(userId, proposalId);

  if (result.success) {
    return ApiResponse.success(res, null, result.message);
  } else {
    const statusCode = result.message?.includes("not found") ? 404 : result.message?.includes("permission") || result.message?.includes("Only the project owner") ? 403 : 400;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Withdraw a proposal (service provider)
 */
export async function withdrawProposal(req: Request, res: Response) {
  const userId = req.user?.id;
  const proposalId = getStringParam(req.params.id);

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!proposalId) {
    return ApiResponse.error(res, "Proposal ID is required", 400);
  }

  const result = await ProposalService.withdrawProposal(userId, proposalId);

  if (result.success) {
    return ApiResponse.success(res, null, result.message);
  } else {
    let statusCode = 500;
    if (result.message?.includes("not found")) statusCode = 404;
    if (result.message?.includes("Only pending")) statusCode = 400;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Check if user has submitted a proposal for a project
 */
export async function checkProposalStatus(req: Request, res: Response) {
  const userId = req.user?.id;
  const projectId = getStringParam(req.params.projectId);

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!projectId) {
    return ApiResponse.error(res, "Project ID is required", 400);
  }

  const result = await ProposalService.hasSubmittedProposal(userId, projectId);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message, 500);
  }
}

/**
 * Request modify (founder): send message to service provider
 */
export async function requestModify(req: Request, res: Response) {
  const userId = req.user?.id;
  const proposalId = getStringParam(req.params.id);
  const { message } = req.body;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!proposalId) {
    return ApiResponse.error(res, "Proposal ID is required", 400);
  }

  const result = await ProposalService.requestModify(userId, proposalId, message ?? '');

  if (result.success) {
    return ApiResponse.success(res, null, result.message);
  } else {
    const statusCode = result.message?.includes("not found") ? 404 : result.message?.includes("permission") ? 403 : 400;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Update proposal NDA fields (founder only)
 */
export async function updateProposalNda(req: Request, res: Response) {
  const userId = req.user?.id;
  const proposalId = getStringParam(req.params.id);
  const { is_nda_signed, nda_file_link, nda_sent_at, nda_signed_at, nda_signed_file_link, nda_downloaded_at, send_offer, accept_offer } = req.body;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!proposalId) {
    return ApiResponse.error(res, "Proposal ID is required", 400);
  }

  const payload: Parameters<typeof ProposalService.updateProposalNda>[2] = {};
  if (typeof is_nda_signed !== "undefined") payload.is_nda_signed = is_nda_signed === true || is_nda_signed === "true";
  if (typeof nda_file_link !== "undefined") payload.nda_file_link = nda_file_link ?? null;
  if (typeof nda_sent_at !== "undefined") payload.nda_sent_at = nda_sent_at ?? null;
  if (typeof nda_signed_at !== "undefined") payload.nda_signed_at = nda_signed_at ?? null;
  if (typeof nda_signed_file_link !== "undefined") payload.nda_signed_file_link = nda_signed_file_link ?? null;
  if (typeof nda_downloaded_at !== "undefined") payload.nda_downloaded_at = nda_downloaded_at ?? null;
  if (typeof send_offer !== "undefined") payload.send_offer = send_offer === true || send_offer === "true";
  if (typeof accept_offer !== "undefined") payload.accept_offer = accept_offer === true || accept_offer === "true";

  const result = await ProposalService.updateProposalNda(userId, proposalId, payload);

  if (result.success) {
    return ApiResponse.success(res, null, result.message);
  } else {
    const statusCode = result.message?.includes("not found") ? 404 : result.message?.includes("permission") ? 403 : 400;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Get proposal activities (founder or proposal provider)
 */
export async function getProposalActivities(req: Request, res: Response) {
  const userId = req.user?.id;
  const proposalId = getStringParam(req.params.id);

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!proposalId) {
    return ApiResponse.error(res, "Proposal ID is required", 400);
  }

  const result = await ProposalService.getProposalActivities(userId, proposalId);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message?.includes("not found") ? 404 : result.message?.includes("permission") ? 403 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}
