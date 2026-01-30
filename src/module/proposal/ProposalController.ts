import { Request, Response } from "express";
import { ProposalService } from "./ProposalService";
import { ApiResponse } from "@utils/ApiResponse";

/**
 * Get helper for safe string params
 */
function getStringParam(param: any): string {
  return typeof param === 'string' ? param : '';
}

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
    milestones, 
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

  const result = await ProposalService.createProposal(userId, projectId, {
    cover_letter,
    proposed_amount: parseFloat(proposed_amount),
    payment_schedule: payment_schedule || 'byProject',
    milestones: milestones || [],
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
    parseInt(limit as string) || 20
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
    parseInt(limit as string) || 20
  );

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message?.includes("not found") ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
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
 * Update proposal status (founder)
 */
export async function updateProposalStatus(req: Request, res: Response) {
  const userId = req.user?.id;
  const proposalId = getStringParam(req.params.id);
  const { status } = req.body;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!proposalId) {
    return ApiResponse.error(res, "Proposal ID is required", 400);
  }

  if (!status || !['ACCEPTED', 'REJECTED'].includes(status)) {
    return ApiResponse.error(res, "Valid status (ACCEPTED or REJECTED) is required", 400);
  }

  const result = await ProposalService.updateProposalStatus(userId, proposalId, status);

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
