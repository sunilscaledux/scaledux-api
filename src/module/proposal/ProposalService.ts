import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";
import { getFileUrl } from '@utils/General';
import { createProposalActivity, getProposalActivities as fetchProposalActivities } from './ProposalActivityService';
import { ConversationService } from '@module/chat/ConversationService';
import { CHAT_SYSTEM_MESSAGES } from '../../constants/chatSystemMessages';
import { BillingService } from '@module/billing/BillingService';

/** Human-readable labels for proposal status (single source of truth for API and activities). */
export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Proposal Accepted',
  OFFER_SENT: 'Offer sent',
  OFFER_ACCEPTED: 'Offer accepted',
  HIRED: 'Hired',
  REJECTED: 'Proposal Rejected',
  WITHDRAWN: 'Offer withdrawn',
  TERMINATED: 'Terminated',
  PROJECT_COMPLETED: 'Project completed'
};

export function getProposalStatusLabel(status: string | undefined | null): string {
  if (status == null || status === '') return '';
  return PROPOSAL_STATUS_LABELS[String(status).toUpperCase()] ?? status;
}

/** NDA + offer data stored in proposal.nda (single JSON column) */
export interface ProposalNdaData {
  offer_expires_at?: string | null;
  is_nda_signed?: boolean;
  nda_file_link?: string | null;
  nda_sent_at?: string | null;
  nda_signed_at?: string | null;
  nda_signed_file_link?: string | null;
  nda_downloaded_at?: string | null;
}

function getNda(proposal: any): ProposalNdaData | null {
  const nda = proposal?.nda;
  if (!nda || typeof nda !== 'object') return null;
  return nda as ProposalNdaData;
}

/** Offer expiry in hours (from .env OFFER_EXPIRY_HOURS, default 24). Countdown starts when NDA is sent. */
function getOfferExpiryHours(): number {
  const val = process.env.OFFER_EXPIRY_HOURS;
  if (val == null || val === '') return 24;
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? n : 24;
}

function flattenNdaToProposal(proposal: any): any {
  const nda = getNda(proposal);
  let offer_expires_at = nda?.offer_expires_at ?? null;
  // When NDA was sent but expiry not set (e.g. old data), derive from nda_sent_at so countdown can show
  const ndaSentAt = nda?.nda_sent_at;
  if ((offer_expires_at == null || offer_expires_at === '') && ndaSentAt) {
    const sent = new Date(ndaSentAt);
    const expires = new Date(sent);
    expires.setHours(expires.getHours() + getOfferExpiryHours());
    offer_expires_at = expires.toISOString();
  }
  return {
    ...proposal,
    offer_expires_at,
    is_nda_signed: nda?.is_nda_signed ?? false,
    nda_file_link: nda?.nda_file_link ?? null,
    nda_sent_at: nda?.nda_sent_at ?? null,
    nda_signed_at: nda?.nda_signed_at ?? null,
    nda_signed_file_link: nda?.nda_signed_file_link ?? null,
    nda_downloaded_at: nda?.nda_downloaded_at ?? null,
    status_label: getProposalStatusLabel(proposal.status)
  };
}

/** Build milestones array from Milestone table rows; deliverables from Deliverable table. */
function milestonesFromRows(rows: any[] | null | undefined): any[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((row) => {
      const deliverables = buildDeliverablesFromRow(row);
      return {
        id: row.unique_id,
        title: row.title ?? '',
        description: row.description ?? undefined,
        amount: Number(row.amount ?? 0),
        dueDate: row.due_date ? new Date(row.due_date).toISOString()?.slice(0, 10) : undefined,
        deliverables,
        payment_status: row.payment_status ?? 'PENDING',
        milestone_status: row.status ?? 'PENDING',
        submitted_file: [],
        is_approved: row.is_approved === true,
        remark: row.remark ?? undefined
      };
    });
}

/** Build deliverables array from Deliverable table rows or fallback to JSON. */
function buildDeliverablesFromRow(row: any): any[] {
  const fromTable = row.deliverablesRow;
  if (Array.isArray(fromTable) && fromTable.length > 0) {
    return fromTable
      .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map((d: any) => {
        const approvedAt = d.approved_at ?? (d.status === 'APPROVED' && d.updated_at ? d.updated_at : null);
        return {
        id: d.unique_id,
        description: d.description ?? '',
        deliverable: d.description ?? '',
        status: d.status ?? 'PENDING',
        submitted_at: d.submitted_at ?? null,
        approved_at: approvedAt ?? null,
        submitted_remark: d.submitted_remark ?? null,
        submitted_file: Array.isArray(d.submitted_file)
          ? (d.submitted_file as any[]).map((f: any) => ({
              url: typeof f?.url === 'string' ? getFileUrl(f.url) : f?.url,
              name: f?.name ?? (typeof f?.url === 'string' ? f.url.split('/').pop() : 'file')
            }))
          : [],
        feedback: d.feedback ?? null
      };
      });
  }
  return [];
}

/** Build milestones with submitted_file derived from deliverables (Deliverable table). */
function milestonesFromRowsWithDocuments(rows: any[] | null | undefined): any[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((row) => {
      const deliverables = buildDeliverablesFromRow(row);
      const submittedFile = deliverables.flatMap((d: any) => (Array.isArray(d.submitted_file) ? d.submitted_file : []));
      return {
        id: row.unique_id,
        title: row.title ?? '',
        description: row.description ?? undefined,
        amount: Number(row.amount ?? 0),
        dueDate: row.due_date ? new Date(row.due_date).toISOString()?.slice(0, 10) : undefined,
        deliverables,
        payment_status: row.payment_status ?? 'PENDING',
        milestone_status: row.status ?? 'PENDING',
        submitted_file: submittedFile,
        is_approved: row.is_approved === true,
        remark: row.remark ?? undefined
      };
    });
}

/**
 * ProposalService
 * Handles all proposal operations for service providers
 */
export class ProposalService {
  /**
   * Create a new proposal for a project
   */
  static async createProposal(
    userId: number,
    projectId: string,
    data: {
      cover_letter?: string;
      proposed_amount: number;
      payment_schedule: string;
      milestones: any[];
      screening_answers: any[];
      attachments: string[];
    }
  ): Promise<ServiceResponse> {
    try {
      // Find the project by unique_id
      const project = await prisma.founderProject.findFirst({
        where: {
          unique_id: projectId,
          status: 'PUBLISHED',
          deleted_at: null
        }
      });

      if (!project) {
        return {
          success: false,
          message: "Project not found or not available"
        };
      }

      // Check if user is trying to submit proposal to their own project
      if (project.user_id === userId) {
        return {
          success: false,
          message: "You cannot submit a proposal to your own project"
        };
      }

      // Check if user already submitted a proposal for this project
      const existingProposal = await (prisma as any).proposal.findFirst({
        where: {
          project_id: project.id,
          provider_id: userId
        }
      });

      if (existingProposal) {
        return {
          success: false,
          message: "You have already submitted a proposal for this project"
        };
      }

      // Create the proposal (milestones live in Milestone table only; proposal.milestones kept empty)
      const proposal = await (prisma as any).proposal.create({
        data: {
          project_id: project.id,
          provider_id: userId,
          cover_letter: data.cover_letter || '',
          proposed_amount: data.proposed_amount,
          payment_schedule: data.payment_schedule,
          milestones: [],
          screening_answers: data.screening_answers,
          attachments: data.attachments,
          status: 'PENDING'
        }
      });

      await ProposalService.syncProposalMilestonesToTable(proposal.id, project.id, data.milestones);

      // Check if user was invited to this project and update status to ACCEPTED
      const invite = await (prisma as any).projectInvite.findFirst({
        where: {
          project_id: project.id,
          provider_id: userId,
          status: 'PENDING'
        }
      });

      if (invite) {
        await (prisma as any).projectInvite.update({
          where: { id: invite.id },
          data: { status: 'ACCEPTED' }
        });
      }

      // Increment proposals_count on the project
      await prisma.founderProject.update({
        where: { id: project.id },
        data: { proposals_count: { increment: 1 } }
      });

      // Sync to chat: conversation founder <-> provider, system message (initiator = provider)
      const projectTitle = project.project_title || "Project";
      await ConversationService.syncSystemMessage(
        project.user_id,
        userId,
        "",
        {
          activityType: "proposal_submitted",
          activityId: proposal.unique_id,
          projectTitle: project.project_title,
          messageSent: `${CHAT_SYSTEM_MESSAGES.PROPOSAL_SUBMITTED_SENT} ${projectTitle}`,
          messageReceived: `${CHAT_SYSTEM_MESSAGES.PROPOSAL_SUBMITTED_RECEIVED} ${projectTitle}`
        },
        project.id,
        userId
      );

      return {
        success: true,
        message: "Proposal submitted successfully",
        data: {
          id: proposal.id,
          unique_id: proposal.unique_id
        }
      };
    } catch (error: any) {
      console.error("Create Proposal Error:", error);
      return {
        success: false,
        message: error.message || "Failed to submit proposal"
      };
    }
  }

  /**
   * Sync proposal milestones JSON to Milestone table (for per-milestone docs and status).
   * Upserts by (proposal_id, order_index). Call after create/update proposal.
   */
  static async syncProposalMilestonesToTable(
    proposalId: number,
    projectId: number,
    milestones: any[]
  ): Promise<void> {
    if (!Array.isArray(milestones)) return;
    const prismaAny = prisma as any;
    if (typeof prismaAny.milestone?.upsert !== 'function') return; // table may not exist yet
    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      const title = m?.title ?? m?.milestoneDescription ?? `Milestone ${i + 1}`;
      const amount = Number(m?.amount ?? m?.amount?.amount ?? 0) || 0;
      const dueDate = m?.dueDate != null ? new Date(m.dueDate) : null;
      const description = m?.description ?? m?.milestoneDescription ?? null;
      const deliverables = Array.isArray(m?.deliverables)
        ? m.deliverables
        : m?.deliverable != null
          ? [{ deliverable: String(m.deliverable) }]
          : [];
      const row = {
        project_id: projectId,
        proposal_id: proposalId,
        order_index: i,
        title: String(title).slice(0, 255),
        description: description != null ? String(description) : null,
        amount,
        due_date: dueDate
      };
      try {
        const existing = await prismaAny.milestone.findUnique({
          where: {
            proposal_id_order_index: { proposal_id: proposalId, order_index: i }
          },
          select: { id: true, is_approved: true }
        });
        let milestone: any;
        if (!existing) {
          milestone = await prismaAny.milestone.create({
            data: { ...row, status: 'PENDING' }
          });
        } else if (existing.is_approved === true) {
          milestone = existing;
          // Skip update for approved milestones
        } else {
          milestone = await prismaAny.milestone.update({
            where: { id: existing.id },
            data: {
              title: row.title,
              description: row.description,
              amount: row.amount,
              due_date: row.due_date
            }
          });
        }
        const skipDeliverableSync = existing?.is_approved === true;
        if (milestone?.id && typeof prismaAny.deliverable?.upsert === 'function' && !skipDeliverableSync) {
          for (let j = 0; j < deliverables.length; j++) {
            const d = deliverables[j];
            const desc = typeof d === 'object' && d?.deliverable != null ? String(d.deliverable) : String(d ?? '');
            if (desc.length === 0) continue;
            try {
              await prismaAny.deliverable.upsert({
                where: {
                  milestone_id_order_index: { milestone_id: milestone.id, order_index: j }
                },
                create: {
                  milestone_id: milestone.id,
                  order_index: j,
                  description: desc.slice(0, 500)
                },
                update: { description: desc.slice(0, 500) }
              });
            } catch (err) {
              console.error('Deliverable upsert error:', err);
            }
          }
          // Remove any deliverables beyond the new list (e.g. user removed some in the form)
          try {
            await prismaAny.deliverable.deleteMany({
              where: {
                milestone_id: milestone.id,
                order_index: { gte: deliverables.length }
              }
            });
          } catch (err) {
            console.error('Deliverable deleteMany error:', err);
          }
        }
      } catch (_) {
        // ignore if table missing or constraint name differs
      }
    }
  }

  /**
   * Add a new milestone (freelancer only, proposal OFFER_ACCEPTED or HIRED).
   * New milestone has is_approved = false until founder approves.
   */
  static async addMilestone(
    userId: number,
    proposalUniqueId: string,
    data: {
      title: string;
      description?: string | null;
      amount: number;
      dueDate: Date | string | null;
      deliverables: { deliverable: string }[];
      remark?: string | null;
    }
  ): Promise<ServiceResponse> {
    try {
      const proposal = await (prisma as any).proposal.findFirst({
        where: { unique_id: proposalUniqueId, provider_id: userId },
        include: {
          project: { select: { id: true, user_id: true, project_title: true, unique_id: true } },
          milestonesRows: { orderBy: { order_index: "asc" }, select: { order_index: true } }
        }
      });
      if (!proposal) {
        return { success: false, message: "Proposal not found or you don't have permission" };
      }
      const status = (proposal as any).status;
      if (status === "PROJECT_COMPLETED") {
        return { success: false, message: "You cannot add milestones after the project is completed" };
      }
      if (status !== "OFFER_ACCEPTED" && status !== "HIRED") {
        return { success: false, message: "You can only add milestones after the offer is accepted or you are hired" };
      }

      const rows = proposal.milestonesRows ?? [];
      const nextIndex = rows.length > 0 ? Math.max(...rows.map((r: any) => r.order_index ?? 0)) + 1 : 0;
      const title = String(data.title || "New milestone").slice(0, 255);
      const amount = Number(data.amount) || 0;
      const dueDate = data.dueDate != null ? new Date(data.dueDate) : null;
      const description = data.description != null ? String(data.description).slice(0, 500) : null;
      const deliverables = Array.isArray(data.deliverables) ? data.deliverables : [];
      const remark =
        data.remark != null && String(data.remark).trim() !== ""
          ? String(data.remark).trim()
          : null;

      const milestone = await (prisma as any).milestone.create({
        data: {
          project_id: proposal.project_id,
          proposal_id: proposal.id,
          order_index: nextIndex,
          title,
          description,
          amount,
          due_date: dueDate,
          status: "PENDING",
          is_approved: false,
          remark
        }
      });

      const prismaAny = prisma as any;
      if (milestone?.id && typeof prismaAny.deliverable?.create === "function") {
        for (let j = 0; j < deliverables.length; j++) {
          const d = deliverables[j];
          const desc = typeof d === "object" && d?.deliverable != null ? String(d.deliverable).slice(0, 500) : "";
          try {
            await prismaAny.deliverable.create({
              data: {
                milestone_id: milestone.id,
                order_index: j,
                description: desc || "Deliverable"
              }
            });
          } catch (_) {
            // ignore
          }
        }
      }

      await createProposalActivity(
        proposal.unique_id,
        "STATUS_CHANGE",
        { message: `New milestone requested: ${title}`, milestoneTitle: title },
        userId
      );

      const projectTitle = proposal.project?.project_title ?? "";
      await ConversationService.syncSystemMessage(
        proposal.project.user_id,
        userId,
        "",
        {
          activityType: "milestone_requested",
          activityId: proposal.unique_id,
          projectTitle,
          milestoneTitle: title,
          messageSent: `${CHAT_SYSTEM_MESSAGES.MILESTONE_REQUESTED_SENT} ${projectTitle}`.trim(),
          messageReceived: `${CHAT_SYSTEM_MESSAGES.MILESTONE_REQUESTED_RECEIVED} ${projectTitle}`.trim()
        },
        proposal.project_id,
        userId
      );

      return { success: true, message: "Milestone added successfully" };
    } catch (error: any) {
      console.error("Add Milestone Error:", error);
      return { success: false, message: error.message || "Failed to add milestone" };
    }
  }

  /**
   * Get all proposals submitted by a service provider
   */
  static async getMyProposals(
    userId: number,
    status?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ServiceResponse> {
    try {
      const whereClause: any = {
        provider_id: userId
      };

      if (status) {
        const statuses = status.split(',').map((s: string) => s.trim()).filter(Boolean);
        whereClause.status = statuses.length > 1 ? { in: statuses } : statuses[0] || status;
      }

      const totalCount = await (prisma as any).proposal.count({ where: whereClause });

      const proposals = await (prisma as any).proposal.findMany({
        where: whereClause,
        include: {
          milestonesRows: {
            orderBy: { order_index: 'asc' },
            include: { deliverablesRow: { orderBy: { order_index: 'asc' } } }
          },
          project: {
            select: {
              id: true,
              unique_id: true,
              project_title: true,
              budget_amount: true,
              budget_currency: true,
              scope_of_work: true,
              status: true,
              created_at: true,
              user: {
                select: {
                  id: true,
                  unique_id: true,
                  first_name: true,
                  last_name: true,
                  currency: {
                    select: {
                      symbol: true
                    }
                  },
                  personalInfo: {
                    select: {
                      profileImage: true,
                      country: { select: { name: true } }
                    }
                  }
                }
              },
              category: {
                select: { id: true, name: true }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      // Transform proposals: milestones from Milestone table; file URLs; flatten nda
      const transformedProposals = proposals.map((proposal: any) =>
        flattenNdaToProposal({
          ...proposal,
          milestones: milestonesFromRows(proposal.milestonesRows),
          attachments: proposal.attachments?.map((url: string) => getFileUrl(url)) || [],
          project: proposal.project ? {
            ...proposal.project,
            budget_currency: proposal.project.user?.currency?.symbol || '₹'
          } : null
        })
      );

      return {
        success: true,
        message: "Proposals retrieved successfully",
        data: {
          proposals: transformedProposals,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        }
      };
    } catch (error: any) {
      console.error("Get My Proposals Error:", error);
      return {
        success: false,
        message: error.message || "Failed to retrieve proposals"
      };
    }
  }

  /**
   * Get proposals for a project.
   * - Project owner: returns all proposals for the project.
   * - Hired freelancer: returns only their own proposal(s) for that project (for project-overview).
   */
  static async getProposalsByProject(
    userId: number,
    projectId: string,
    status?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ServiceResponse> {
    try {
      const project = await prisma.founderProject.findFirst({
        where: {
          unique_id: projectId,
          deleted_at: null
        }
      });

      if (!project) {
        return {
          success: false,
          message: "Project not found"
        };
      }

      const isOwner = project.user_id === userId;
      const whereClause: any = {
        project_id: project.id
      };

      if (!isOwner) {
        const hasProposal = await (prisma as any).proposal.findFirst({
          where: { project_id: project.id, provider_id: userId }
        });
        if (!hasProposal) {
          return {
            success: false,
            message: "You don't have permission to view proposals for this project"
          };
        }
        whereClause.provider_id = userId;
      }

      if (status) {
        whereClause.status = status;
      }

      const totalCount = await (prisma as any).proposal.count({ where: whereClause });

      const proposals = await (prisma as any).proposal.findMany({
        where: whereClause,
        include: {
          project: {
            select: {
              id: true,
              unique_id: true,
              project_title: true,
              budget_currency: true,
              budget_amount: true
            }
          },
          milestonesRows: {
            orderBy: { order_index: 'asc' },
            include: { deliverablesRow: { orderBy: { order_index: 'asc' } } }
          },
          provider: {
            select: {
              id: true,
              unique_id: true,
              first_name: true,
              last_name: true,
              email: true,
              personalInfo: {
                select: {
                  profileImage: true,
                  title: true,
                  about: true,
                  hourly_rate: true,
                  country: { select: { name: true } },
                  city: true,
                  links: true,
                  languages: true
                }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      // Transform proposals: milestones from Milestone table; file URLs; flatten nda
      const transformedProposals = proposals.map((proposal: any) =>
        flattenNdaToProposal({
          ...proposal,
          milestones: milestonesFromRows(proposal.milestonesRows),
          attachments: proposal.attachments?.map((url: string) => getFileUrl(url)) || [],
          provider: proposal.provider ? {
            ...proposal.provider,
            personalInfo: proposal.provider.personalInfo ? {
              ...proposal.provider.personalInfo,
              profileImage: proposal.provider.personalInfo.profileImage 
                ? getFileUrl(proposal.provider.personalInfo.profileImage)
                : null
            } : null
          } : null
        })
      );

      return {
        success: true,
        message: "Proposals retrieved successfully",
        data: {
          proposals: transformedProposals,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        }
      };
    } catch (error: any) {
      console.error("Get Proposals By Project Error:", error);
      return {
        success: false,
        message: error.message || "Failed to retrieve proposals"
      };
    }
  }

  /**
   * Get founder's proposals by contract status (ACCEPTED, OFFER_SENT, OFFER_ACCEPTED, HIRED, REJECTED, TERMINATED, WITHDRAWN).
   */
  static async getFounderContracts(
    userId: number,
    status: 'ACCEPTED' | 'OFFER_SENT' | 'OFFER_ACCEPTED' | 'HIRED' | 'REJECTED' | 'TERMINATED' | 'WITHDRAWN',
    page: number = 1,
    limit: number = 20
  ): Promise<ServiceResponse> {
    try {
      // Hired tab includes both HIRED and PROJECT_COMPLETED so both can view offer and project overview
      const statusFilter = status === 'HIRED'
        ? { in: ['HIRED', 'PROJECT_COMPLETED'] as const }
        : status;
      const whereClause = {
        status: statusFilter,
        project: {
          user_id: userId,
          deleted_at: null
        }
      };

      const totalCount = await (prisma as any).proposal.count({ where: whereClause });

      const proposals = await (prisma as any).proposal.findMany({
        where: whereClause,
        include: {
          project: {
            select: {
              id: true,
              unique_id: true,
              project_title: true,
              budget_currency: true,
              budget_amount: true
            }
          },
          milestonesRows: {
            orderBy: { order_index: 'asc' },
            include: { deliverablesRow: { orderBy: { order_index: 'asc' } } }
          },
          provider: {
            select: {
              id: true,
              unique_id: true,
              first_name: true,
              last_name: true,
              email: true,
              personalInfo: {
                select: {
                  profileImage: true,
                  title: true,
                  about: true,
                  hourly_rate: true,
                  country: { select: { name: true } },
                  city: true,
                  links: true,
                  languages: true
                }
              }
            }
          }
        },
        orderBy: { updated_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      const transformedProposals = proposals.map((proposal: any) =>
        flattenNdaToProposal({
          ...proposal,
          milestones: milestonesFromRows(proposal.milestonesRows),
          attachments: proposal.attachments?.map((url: string) => getFileUrl(url)) || [],
          provider: proposal.provider ? {
            ...proposal.provider,
            personalInfo: proposal.provider.personalInfo ? {
              ...proposal.provider.personalInfo,
              profileImage: proposal.provider.personalInfo.profileImage
                ? getFileUrl(proposal.provider.personalInfo.profileImage)
                : null
            } : null
          } : null
        })
      );

      return {
        success: true,
        message: "Contracts retrieved successfully",
        data: {
          proposals: transformedProposals,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        }
      };
    } catch (error: any) {
      console.error("Get Founder Contracts Error:", error);
      return {
        success: false,
        message: error.message || "Failed to retrieve contracts"
      };
    }
  }

  /**
   * Get a single proposal by ID
   */
  static async getProposalById(
    userId: number,
    proposalId: string
  ): Promise<ServiceResponse> {
    try {
      const proposal = await (prisma as any).proposal.findFirst({
        where: {
          unique_id: proposalId
        },
        include: {
          milestonesRows: {
            orderBy: { order_index: 'asc' },
            include: { deliverablesRow: { orderBy: { order_index: 'asc' } } }
          },
          project: {
            select: {
              id: true,
              unique_id: true,
              project_title: true,
              project_description: true,
              budget_amount: true,
              budget_currency: true,
              is_nda_required: true,
              scope_of_work: true,
              experience_needed: true,
              skills_required: true,
              screening_questions: true,
              status: true,
              user_id: true,
              user: {
                select: {
                  id: true,
                  unique_id: true,
                  first_name: true,
                  last_name: true,
                  currency: {
                    select: { symbol: true }
                  },
                  personalInfo: {
                    select: {
                      profileImage: true,
                      about: true,
                      country: { select: { name: true } },
                      city: true
                    }
                  }
                }
              },
              category: {
                select: { id: true, name: true }
              }
            }
          },
          provider: {
            select: {
              id: true,
              unique_id: true,
              first_name: true,
              last_name: true,
              email: true,
              personalInfo: {
                select: {
                  profileImage: true,
                  title: true,
                  about: true,
                  hourly_rate: true,
                  country: { select: { name: true } },
                  city: true,
                  links: true,
                  languages: true
                }
              }
            }
          }
        }
      });

      if (!proposal) {
        return {
          success: false,
          message: "Proposal not found"
        };
      }

      // Check if user is either the proposal owner or the project owner
      const isProposalOwner = proposal.provider_id === userId;
      const isProjectOwner = proposal.project?.user_id === userId;

      if (!isProposalOwner && !isProjectOwner) {
        return {
          success: false,
          message: "You don't have permission to view this proposal"
        };
      }

      // Transform with file URLs; milestones include submitted_file derived from deliverables
      const projectUser = proposal.project?.user;
      const transformedProposal: any = {
        ...proposal,
        milestones: milestonesFromRowsWithDocuments(proposal.milestonesRows),
        attachments: proposal.attachments?.map((url: string) => getFileUrl(url)) || [],
        milestonesRows: proposal.milestonesRows ?? [],
        project: proposal.project ? {
          ...proposal.project,
          budget_currency: proposal.project.user?.currency?.symbol || '₹',
          user: projectUser ? {
            ...projectUser,
            personalInfo: projectUser.personalInfo ? {
              ...projectUser.personalInfo,
              profileImage: projectUser.personalInfo.profileImage
                ? getFileUrl(projectUser.personalInfo.profileImage)
                : null
            } : null
          } : null
        } : null,
        provider: proposal.provider ? {
          ...proposal.provider,
          personalInfo: proposal.provider.personalInfo ? {
            ...proposal.provider.personalInfo,
            profileImage: proposal.provider.personalInfo.profileImage 
              ? getFileUrl(proposal.provider.personalInfo.profileImage)
              : null
          } : null
        } : null
      };

      // Founder view: add 24h hire cooldown (can't hire another for 24h after accepting one)
      if (isProjectOwner) {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const lastAccepted = await (prisma as any).proposal.findFirst({
          where: {
            project: { user_id: userId },
            status: 'ACCEPTED',
            id: { not: proposal.id }
          },
          orderBy: { updated_at: 'desc' },
          select: { updated_at: true }
        });
        if (lastAccepted && new Date(lastAccepted.updated_at) > twentyFourHoursAgo) {
          const cooldownUntil = new Date(lastAccepted.updated_at);
          cooldownUntil.setHours(cooldownUntil.getHours() + 24);
          transformedProposal.hire_cooldown_until = cooldownUntil.toISOString();
        }
      }

      return {
        success: true,
        message: "Proposal retrieved successfully",
        data: flattenNdaToProposal(transformedProposal)
      };
    } catch (error: any) {
      console.error("Get Proposal By ID Error:", error);
      return {
        success: false,
        message: error.message || "Failed to retrieve proposal"
      };
    }
  }

  /**
   * Update proposal content (service provider only, PENDING only)
   */
  static async updateProposal(
    userId: number,
    proposalId: string,
    data: {
      cover_letter?: string;
      proposed_amount: number;
      payment_schedule: string;
      milestones: any[];
      screening_answers: any[];
      attachments: string[];
    }
  ): Promise<ServiceResponse> {
    try {
      const proposal = await (prisma as any).proposal.findFirst({
        where: { unique_id: proposalId, provider_id: userId },
        include: { project: { select: { id: true, unique_id: true, user_id: true, project_title: true } } }
      });
      if (!proposal) {
        return { success: false, message: "Proposal not found or you don't have permission" };
      }
      if (proposal.status !== 'PENDING') {
        return { success: false, message: "Only pending proposals can be edited" };
      }
      if ((proposal as any).milestones_approved === true) {
        return { success: false, message: "Milestones are locked after hire and cannot be edited" };
      }
      const oldSnapshot = {
        status: proposal.status,
        cover_letter: proposal.cover_letter,
        proposed_amount: proposal.proposed_amount?.toString?.(),
        payment_schedule: proposal.payment_schedule,
        screening_answers: proposal.screening_answers,
        attachments: proposal.attachments
      };
      await createProposalActivity(proposal.unique_id, 'CONTENT_UPDATE', { oldSnapshot }, userId);
      await (prisma as any).proposal.update({
        where: { id: proposal.id },
        data: {
          cover_letter: data.cover_letter ?? proposal.cover_letter,
          proposed_amount: data.proposed_amount,
          payment_schedule: data.payment_schedule,
          screening_answers: data.screening_answers,
          attachments: data.attachments
        }
      });
      await ProposalService.syncProposalMilestonesToTable(proposal.id, proposal.project_id, data.milestones);

      if (proposal.project?.id != null && proposal.project?.user_id != null) {
        const projectTitle = proposal.project.project_title || "Project";
        await ConversationService.syncSystemMessage(
          proposal.project.user_id,
          userId,
          "",
          {
            activityType: "proposal_updated",
            activityId: proposal.unique_id,
            projectTitle,
            messageSent: `${CHAT_SYSTEM_MESSAGES.PROPOSAL_UPDATED_SENT} ${projectTitle}`,
            messageReceived: `${CHAT_SYSTEM_MESSAGES.PROPOSAL_UPDATED_RECEIVED} ${projectTitle}`
          },
          proposal.project.id,
          userId
        );
      }

      return { success: true, message: "Proposal updated successfully" };
    } catch (error: any) {
      console.error("Update Proposal Error:", error);
      return { success: false, message: error.message || "Failed to update proposal" };
    }
  }

  /**
   * Update proposal status (founder only).
   * ACCEPTED = proposal accepted; REJECTED = rejected.
   * OFFER_SENT is set when founder sends the NDA (in updateProposalNda), not here.
   * When rejecting, reason is required and stored in remark + synced to chat.
   */
  static async updateProposalStatus(
    userId: number,
    proposalId: string,
    status: 'ACCEPTED' | 'REJECTED',
    rejectionReason?: string
  ): Promise<ServiceResponse> {
    try {
      if (status === 'REJECTED' && (!rejectionReason || !rejectionReason.trim())) {
        return { success: false, message: "Reason for rejection is required" };
      }

      // Find the proposal
      const proposal = await (prisma as any).proposal.findFirst({
        where: {
          unique_id: proposalId
        },
        include: {
          project: {
            select: {
              id: true,
              user_id: true,
              project_title: true
            }
          }
        }
      });

      if (!proposal) {
        return {
          success: false,
          message: "Proposal not found"
        };
      }

      // Check if user is the project owner
      if (proposal.project.user_id !== userId) {
        return {
          success: false,
          message: "You don't have permission to update this proposal"
        };
      }

      await createProposalActivity(proposal.unique_id, 'STATUS_CHANGE', {
        oldStatus: proposal.status,
        newStatus: status,
        ...(status === 'REJECTED' && rejectionReason ? { message: rejectionReason } : {})
      }, userId);

      if (status === 'REJECTED' && rejectionReason?.trim()) {
        await prisma.$executeRaw`
          UPDATE scd_proposals SET status = 'REJECTED', remark = ${rejectionReason.trim()}, updated_at = NOW() WHERE id = ${proposal.id}
        `;
      } else {
        const updateData: any = { status };
        await (prisma as any).proposal.update({
          where: { id: proposal.id },
          data: updateData
        });
      }

      // Sync to chat: notify provider (initiator = founder)
      const sentText = status === 'ACCEPTED' ? CHAT_SYSTEM_MESSAGES.PROPOSAL_ACCEPTED_SENT : CHAT_SYSTEM_MESSAGES.PROPOSAL_REJECTED_SENT;
      const receivedText = status === 'ACCEPTED' ? CHAT_SYSTEM_MESSAGES.PROPOSAL_ACCEPTED_RECEIVED : CHAT_SYSTEM_MESSAGES.PROPOSAL_REJECTED_RECEIVED;
      const metadata: Record<string, unknown> = {
        activityType: "proposal_status",
        activityId: proposal.unique_id,
        newStatus: status,
        messageSent: sentText,
        messageReceived: receivedText
      };
      if (status === 'REJECTED' && rejectionReason?.trim()) {
        metadata.message = rejectionReason.trim();
      }
      await ConversationService.syncSystemMessage(
        proposal.project.user_id,
        proposal.provider_id,
        "",
        metadata,
        proposal.project.id,
        proposal.project.user_id
      );

      return {
        success: true,
        message: `Proposal ${status.toLowerCase()} successfully`
      };
    } catch (error: any) {
      console.error("Update Proposal Status Error:", error);
      return {
        success: false,
        message: error.message || "Failed to update proposal status"
      };
    }
  }

  /**
   * Cancel hire (withdraw offer). Allowed only when status is ACCEPTED and NDA is not signed.
   */
  static async cancelHire(
    userId: number,
    proposalId: string,
    body: { reason?: string }
  ): Promise<ServiceResponse> {
    try {
      const proposal = await (prisma as any).proposal.findFirst({
        where: { unique_id: proposalId },
        include: {
          project: {
            select: { id: true, user_id: true, project_title: true }
          }
        }
      });
      if (!proposal) {
        return { success: false, message: "Proposal not found" };
      }
      if (proposal.project.user_id !== userId) {
        return { success: false, message: "Only the project owner can withdraw the offer" };
      }
      if (proposal.status !== 'OFFER_SENT') {
        return { success: false, message: "Only an offer that has been sent (and not yet accepted via NDA) can be withdrawn" };
      }
      const nda = getNda(proposal);
      if (nda?.is_nda_signed === true) {
        return { success: false, message: "Cannot withdraw offer after the freelancer has signed the NDA" };
      }

      const nextNda = { ...(nda || {}), offer_expires_at: null };
      await (prisma as any).proposal.update({
        where: { id: proposal.id },
        data: {
          status: 'WITHDRAWN',
          nda: nextNda
        }
      });

      await createProposalActivity(proposal.unique_id, 'STATUS_CHANGE', { oldStatus: 'OFFER_SENT', newStatus: 'WITHDRAWN' }, userId);

      const projectTitle = proposal.project.project_title || "Project";
      const sentText = `${CHAT_SYSTEM_MESSAGES.OFFER_CANCELLED_SENT} ${projectTitle}`;
      const receivedText = `${CHAT_SYSTEM_MESSAGES.OFFER_CANCELLED_RECEIVED} ${projectTitle}`;
      const metadata: Record<string, unknown> = {
        activityType: "offer_cancelled",
        activityId: proposal.unique_id,
        messageSent: sentText,
        messageReceived: receivedText
      };
      if (body.reason?.trim()) {
        metadata.message = body.reason.trim();
      }
      await ConversationService.syncSystemMessage(
        proposal.project.user_id,
        proposal.provider_id,
        "",
        metadata,
        proposal.project.id,
        proposal.project.user_id
      );

      return {
        success: true,
        message: "Offer withdrawn successfully"
      };
    } catch (error: any) {
      console.error("Cancel hire Error:", error);
      return {
        success: false,
        message: error.message || "Failed to withdraw offer"
      };
    }
  }

  /**
   * Decline offer (freelancer only). Allowed only when status is OFFER_SENT. Sets status to REJECTED, stores reason in remark, syncs to chat.
   */
  static async declineOffer(
    userId: number,
    proposalId: string,
    body: { reason?: string }
  ): Promise<ServiceResponse> {
    try {
      const proposal = await (prisma as any).proposal.findFirst({
        where: { unique_id: proposalId },
        include: {
          project: {
            select: { id: true, user_id: true, project_title: true }
          }
        }
      });
      if (!proposal) {
        return { success: false, message: "Proposal not found" };
      }
      if (proposal.provider_id !== userId) {
        return { success: false, message: "Only the freelancer can decline this offer" };
      }
      if (proposal.status !== 'OFFER_SENT') {
        return { success: false, message: "Only an offer that has been sent can be declined" };
      }

      const remark = body.reason?.trim() || null;
      await (prisma as any).proposal.update({
        where: { id: proposal.id },
        data: {
          status: 'REJECTED',
          ...(remark ? { remark } : {})
        }
      });

      await createProposalActivity(proposal.unique_id, 'STATUS_CHANGE', {
        oldStatus: 'OFFER_SENT',
        newStatus: 'REJECTED',
        ...(remark ? { message: remark } : {})
      }, userId);

      const projectTitle = proposal.project?.project_title || "Project";
      const sentText = `${CHAT_SYSTEM_MESSAGES.OFFER_DECLINED_SENT} ${projectTitle}`;
      const receivedText = `${CHAT_SYSTEM_MESSAGES.OFFER_DECLINED_RECEIVED} ${projectTitle}`;
      const metadata: Record<string, unknown> = {
        activityType: "offer_declined",
        activityId: proposal.unique_id,
        messageSent: sentText,
        messageReceived: receivedText
      };
      if (remark) metadata.message = remark;
      await ConversationService.syncSystemMessage(
        proposal.project.user_id,
        proposal.provider_id,
        "",
        metadata,
        proposal.project.id,
        userId
      );

      return { success: true, message: "Offer declined successfully" };
    } catch (error: any) {
      console.error("Decline offer Error:", error);
      return {
        success: false,
        message: error.message || "Failed to decline offer"
      };
    }
  }

  /**
   * Hire is no longer set via this endpoint. HIRED is set only when the founder completes the first
   * payment (first milestone or full proposal payment) in the billing flow. This endpoint returns
   * an error so clients use the payment screen.
   */
  static async setHire(userId: number, proposalId: string): Promise<ServiceResponse> {
    try {
      const proposal = await (prisma as any).proposal.findFirst({
        where: { unique_id: proposalId },
        include: {
          project: { select: { id: true, user_id: true } }
        }
      });
      if (!proposal) {
        return { success: false, message: "Proposal not found" };
      }
      if (proposal.project.user_id !== userId) {
        return { success: false, message: "Only the project owner can hire" };
      }
      if (proposal.status !== "OFFER_ACCEPTED") {
        return { success: false, message: "You can only hire after the freelancer has signed the NDA (offer accepted)" };
      }

      return {
        success: false,
        message: "Hire is completed when you complete the first payment. Please use the payment screen to hire and proceed to pay."
      };
    } catch (error: any) {
      console.error("Set hire Error:", error);
      return { success: false, message: error.message || "Failed to hire" };
    }
  }

  /**
   * Mark project completed (founder only). Allowed when status is HIRED and all milestones are PAID (or COMPLETED).
   * Sets proposal status to PROJECT_COMPLETED.
   */
  static async markProjectCompleted(userId: number, proposalId: string): Promise<ServiceResponse> {
    try {
      const proposal = await (prisma as any).proposal.findFirst({
        where: { unique_id: proposalId },
        include: {
          project: { select: { id: true, user_id: true } },
          milestonesRows: { orderBy: { order_index: 'asc' } }
        }
      });
      if (!proposal) {
        return { success: false, message: "Proposal not found" };
      }
      if (proposal.project.user_id !== userId) {
        return { success: false, message: "Only the project owner can mark the project as completed" };
      }
      if (proposal.status === "PROJECT_COMPLETED") {
        return { success: true, message: "Project is already marked as completed" };
      }
      if (proposal.status !== "HIRED") {
        return { success: false, message: "Project can only be marked completed when the contract is hired" };
      }
      const rows = proposal.milestonesRows ?? [];
      const allDone = rows.length > 0 && rows.every((m: any) => {
        const s = String(m.status ?? "").toUpperCase();
        return s === "PAID" || s === "COMPLETED";
      });
      if (!allDone) {
        return { success: false, message: "Complete and pay all milestones before marking the project as completed" };
      }

      await createProposalActivity(proposal.unique_id, "STATUS_CHANGE", {
        oldStatus: proposal.status,
        newStatus: "PROJECT_COMPLETED"
      }, userId);

      await (prisma as any).proposal.update({
        where: { id: proposal.id },
        data: { status: "PROJECT_COMPLETED" }
      });

      return { success: true, message: "Project marked as completed" };
    } catch (error: any) {
      console.error("Mark project completed Error:", error);
      return { success: false, message: error.message || "Failed to mark project as completed" };
    }
  }

  /**
   */
  static async updateProposalNda(
    userId: number,
    proposalId: string,
    data: {
      is_nda_signed?: boolean;
      nda_file_link?: string | null;
      nda_sent_at?: string | Date | null;
      nda_signed_at?: string | Date | null;
      nda_signed_file_link?: string | null;
      nda_downloaded_at?: string | Date | null;
      /** When true and project has no NDA: founder sends offer (ACCEPTED -> OFFER_SENT). */
      send_offer?: boolean;
      /** When true and project has no NDA: freelancer accepts offer (OFFER_SENT -> OFFER_ACCEPTED). */
      accept_offer?: boolean;
    }
  ): Promise<ServiceResponse> {
    try {
      const proposal = await (prisma as any).proposal.findFirst({
        where: { unique_id: proposalId },
        include: {
          project: {
            select: { id: true, user_id: true, project_title: true, unique_id: true, is_nda_required: true }
          }
        }
      });
      if (!proposal) {
        return { success: false, message: "Proposal not found" };
      }
      const isFounder = proposal.project.user_id === userId;
      const isProvider = proposal.provider_id === userId;
      if (!isFounder && !isProvider) {
        return { success: false, message: "You don't have permission to update this proposal" };
      }

      const isNdaRequired = proposal.project.is_nda_required === true;

      // Founder: send offer when NDA not required (ACCEPTED/PENDING -> OFFER_SENT)
      if (isFounder && !isNdaRequired && data.send_offer === true && (proposal.status === 'ACCEPTED' || proposal.status === 'PENDING')) {
        const otherActive = await (prisma as any).proposal.count({
          where: {
            project_id: proposal.project_id,
            status: { in: ['OFFER_SENT', 'OFFER_ACCEPTED'] },
            id: { not: proposal.id }
          }
        });
        if (otherActive > 0) {
          return {
            success: false,
            message: "You can only have one active offer per project. Withdraw the current offer before sending a new one."
          };
        }
        const nda = getNda(proposal) || {};
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setHours(expiresAt.getHours() + getOfferExpiryHours());
        const ndaUpdate = { ...nda, offer_expires_at: expiresAt.toISOString() };
        await (prisma as any).proposal.update({
          where: { id: proposal.id },
          data: { status: 'OFFER_SENT', nda: ndaUpdate }
        });
        await createProposalActivity(proposal.unique_id, 'STATUS_CHANGE', { oldStatus: proposal.status, newStatus: 'OFFER_SENT' }, userId);
        await ConversationService.syncSystemMessage(
          proposal.project.user_id,
          proposal.provider_id,
          "",
          {
            activityType: "proposal_status",
            activityId: proposal.unique_id,
            newStatus: "OFFER_SENT",
            messageSent: CHAT_SYSTEM_MESSAGES.OFFER_SENT_SENT,
            messageReceived: CHAT_SYSTEM_MESSAGES.OFFER_SENT_RECEIVED
          },
          proposal.project.id,
          proposal.project.user_id
        );
        return { success: true, message: "Offer sent" };
      }

      // Freelancer: accept offer when NDA not required (OFFER_SENT -> OFFER_ACCEPTED)
      if (isProvider && !isNdaRequired && data.accept_offer === true && proposal.status === 'OFFER_SENT') {
        await (prisma as any).proposal.update({
          where: { id: proposal.id },
          data: { status: 'OFFER_ACCEPTED' }
        });
        await createProposalActivity(proposal.unique_id, 'STATUS_CHANGE', { oldStatus: 'OFFER_SENT', newStatus: 'OFFER_ACCEPTED' }, userId);
        await ConversationService.syncSystemMessage(
          proposal.project.user_id,
          proposal.provider_id,
          "",
          {
            activityType: "proposal_status",
            activityId: proposal.unique_id,
            newStatus: "OFFER_ACCEPTED",
            messageSent: CHAT_SYSTEM_MESSAGES.CONTRACT_SIGNED_SENT,
            messageReceived: CHAT_SYSTEM_MESSAGES.CONTRACT_SIGNED_RECEIVED
          },
          proposal.project.id,
          proposal.provider_id
        );
        return { success: true, message: "Offer accepted" };
      }

      if (data.send_offer === true && isFounder) {
        return { success: false, message: isNdaRequired
          ? "This project requires an NDA. Use the NDA section to upload and send the offer."
          : "Proposal must be accepted before sending the offer." };
      }
      if (data.accept_offer === true && isProvider) {
        return { success: false, message: isNdaRequired
          ? "This project requires NDA. Sign and upload the NDA to accept."
          : "Offer is not in a state that can be accepted." };
      }

      const current = getNda(proposal) || {};
      const toDateIso = (v: string | Date | null | undefined): string | null =>
        v == null ? null : typeof v === 'string' ? v : new Date(v).toISOString();

      if (isFounder) {
        if (data.is_nda_signed !== undefined) current.is_nda_signed = data.is_nda_signed;
        if (data.nda_file_link !== undefined) current.nda_file_link = data.nda_file_link ?? null;
        if (data.nda_sent_at !== undefined) current.nda_sent_at = toDateIso(data.nda_sent_at);
        if (data.nda_signed_at !== undefined) current.nda_signed_at = toDateIso(data.nda_signed_at);
        if (data.nda_file_link && !current.nda_sent_at) {
          const now = new Date();
          current.nda_sent_at = now.toISOString();
          // Countdown starts when NDA sign request is sent; expiry from OFFER_EXPIRY_HOURS (default 24)
          const expiresAt = new Date(now);
          expiresAt.setHours(expiresAt.getHours() + getOfferExpiryHours());
          current.offer_expires_at = expiresAt.toISOString();
        }
        if (data.nda_downloaded_at !== undefined) current.nda_downloaded_at = toDateIso(data.nda_downloaded_at);
      }

      if (isProvider) {
        if (data.is_nda_signed !== undefined) current.is_nda_signed = data.is_nda_signed;
        if (data.nda_signed_at !== undefined) current.nda_signed_at = toDateIso(data.nda_signed_at);
        if (data.nda_signed_file_link !== undefined) current.nda_signed_file_link = data.nda_signed_file_link ?? null;
        if (data.nda_downloaded_at !== undefined) current.nda_downloaded_at = toDateIso(data.nda_downloaded_at);
      }

      // When founder sends the NDA: one-active-offer check before saving (so we don't save NDA then reject)
      if (isFounder && data.nda_file_link !== undefined && (proposal.status === 'PENDING' || proposal.status === 'ACCEPTED')) {
        const otherActive = await (prisma as any).proposal.count({
          where: {
            project_id: proposal.project_id,
            status: { in: ['OFFER_SENT', 'OFFER_ACCEPTED'] },
            id: { not: proposal.id }
          }
        });
        if (otherActive > 0) {
          return {
            success: false,
            message: "You can only have one active offer per project. Withdraw the current offer before sending a new one."
          };
        }
      }

      await (prisma as any).proposal.update({
        where: { id: proposal.id },
        data: { nda: current }
      });

      // When founder sends the NDA (uploads nda_file_link), set status to OFFER_SENT
      const didJustSendOffer = isFounder && data.nda_file_link !== undefined && (proposal.status === 'PENDING' || proposal.status === 'ACCEPTED');
      if (didJustSendOffer) {
        await createProposalActivity(proposal.unique_id, 'STATUS_CHANGE', {
          oldStatus: proposal.status,
          newStatus: 'OFFER_SENT'
        }, userId);
        await (prisma as any).proposal.update({
          where: { id: proposal.id },
          data: { status: 'OFFER_SENT' }
        });
        await ConversationService.syncSystemMessage(
          proposal.project.user_id,
          proposal.provider_id,
          "",
          {
            activityType: "proposal_status",
            activityId: proposal.unique_id,
            newStatus: "OFFER_SENT",
            messageSent: CHAT_SYSTEM_MESSAGES.OFFER_SENT_SENT,
            messageReceived: CHAT_SYSTEM_MESSAGES.OFFER_SENT_RECEIVED
          },
          proposal.project.id,
          proposal.project.user_id
        );
      }

      // When freelancer signs NDA, move status from OFFER_SENT to OFFER_ACCEPTED (so founder can proceed to payment)
      if (isProvider && (data.is_nda_signed === true || data.nda_signed_file_link) && proposal.status === 'OFFER_SENT') {
        await (prisma as any).proposal.update({
          where: { id: proposal.id },
          data: { status: 'OFFER_ACCEPTED' }
        });
        await createProposalActivity(proposal.unique_id, 'STATUS_CHANGE', { oldStatus: 'OFFER_SENT', newStatus: 'OFFER_ACCEPTED' }, userId);
      }

      // Contract-sent notification: only when founder updates NDA but we did not just send the offer (avoid duplicate with OFFER_SENT above)
      if (isFounder && (data.nda_file_link !== undefined || data.is_nda_signed !== undefined) && !didJustSendOffer) {
        const projectTitle = proposal.project.project_title || "Project";
        const receivedMsg = data.is_nda_signed
          ? CHAT_SYSTEM_MESSAGES.CONTRACT_SENT_RECEIVED
          : `${CHAT_SYSTEM_MESSAGES.CONTRACT_SENT_RECEIVED} ${projectTitle}. ${CHAT_SYSTEM_MESSAGES.NDA_SIGN_REQUEST}`;
        await ConversationService.syncSystemMessage(
          proposal.project.user_id,
          proposal.provider_id,
          "",
          {
            activityType: "contract_sent",
            activityId: proposal.unique_id,
            projectTitle: proposal.project.project_title,
            messageSent: CHAT_SYSTEM_MESSAGES.CONTRACT_SENT_SENT,
            messageReceived: receivedMsg
          },
          proposal.project.id,
          userId
        );
      }

      if (isProvider && (data.is_nda_signed === true || data.nda_signed_file_link)) {
        await ConversationService.syncSystemMessage(
          proposal.project.user_id,
          proposal.provider_id,
          "",
          {
            activityType: "contract_signed",
            activityId: proposal.unique_id,
            projectTitle: proposal.project.project_title,
            messageSent: CHAT_SYSTEM_MESSAGES.CONTRACT_SIGNED_SENT,
            messageReceived: CHAT_SYSTEM_MESSAGES.CONTRACT_SIGNED_RECEIVED
          },
          proposal.project.id,
          userId
        );
      }

      return { success: true, message: "NDA details updated successfully" };
    } catch (error: any) {
      console.error("Update Proposal NDA Error:", error);
      return {
        success: false,
        message: error.message || "Failed to update NDA details"
      };
    }
  }

  /**
   * Withdraw a proposal (service provider only)
   */
  static async withdrawProposal(
    userId: number,
    proposalId: string
  ): Promise<ServiceResponse> {
    try {
      // Find the proposal
      const proposal = await (prisma as any).proposal.findFirst({
        where: {
          unique_id: proposalId,
          provider_id: userId
        },
        include: {
          project: {
            select: { id: true }
          }
        }
      });

      if (!proposal) {
        return {
          success: false,
          message: "Proposal not found or you don't have permission"
        };
      }

      if (proposal.status !== 'PENDING') {
        return {
          success: false,
          message: "Only pending proposals can be withdrawn"
        };
      }

      // Update status to WITHDRAWN
      await (prisma as any).proposal.update({
        where: { id: proposal.id },
        data: { status: 'WITHDRAWN' }
      });

      await createProposalActivity(proposal.unique_id, 'STATUS_CHANGE', { oldStatus: 'PENDING', newStatus: 'WITHDRAWN' }, userId);

      // Decrement proposals_count on the project
      await prisma.founderProject.update({
        where: { id: proposal.project.id },
        data: { proposals_count: { decrement: 1 } }
      });

      // Sync to chat: notify founder (provider withdrew)
      const project = await prisma.founderProject.findFirst({
        where: { id: proposal.project.id },
        select: { user_id: true, project_title: true, unique_id: true }
      });
      if (project) {
        const projectTitle = project.project_title || "Project";
        await ConversationService.syncSystemMessage(
          project.user_id,
          userId,
          "",
          {
            activityType: "proposal_withdrawn",
            activityId: proposal.unique_id,
            projectTitle: project.project_title,
            messageSent: CHAT_SYSTEM_MESSAGES.PROPOSAL_WITHDRAWN_SENT,
            messageReceived: CHAT_SYSTEM_MESSAGES.PROPOSAL_WITHDRAWN_RECEIVED
          },
          proposal.project.id,
          userId
        );
      }

      return {
        success: true,
        message: "Proposal withdrawn successfully"
      };
    } catch (error: any) {
      console.error("Withdraw Proposal Error:", error);
      return {
        success: false,
        message: error.message || "Failed to withdraw proposal"
      };
    }
  }

  /**
   * Terminate contract (founder or freelancer). Only when status is HIRED. Requires reason; syncs to chat.
   */
  static async terminateContract(
    userId: number,
    proposalId: string,
    reason: string
  ): Promise<ServiceResponse> {
    try {
      const proposal = await (prisma as any).proposal.findFirst({
        where: { unique_id: proposalId },
        include: {
          project: { select: { id: true, user_id: true, project_title: true, unique_id: true } }
        }
      });
      if (!proposal) {
        return { success: false, message: "Proposal not found" };
      }
      if (proposal.status !== "HIRED") {
        return { success: false, message: "Only a hired contract can be terminated" };
      }
      const isFounder = proposal.project.user_id === userId;
      const isProvider = proposal.provider_id === userId;
      if (!isFounder && !isProvider) {
        return { success: false, message: "You don't have permission to terminate this contract" };
      }
      const trimmed = (reason || "").trim();
      if (!trimmed) {
        return { success: false, message: "Reason is required" };
      }

      await (prisma as any).proposal.update({
        where: { id: proposal.id },
        data: { status: "TERMINATED" }
      });

      await createProposalActivity(proposal.unique_id, 'STATUS_CHANGE', { oldStatus: 'HIRED', newStatus: 'TERMINATED', message: trimmed }, userId);

      const projectTitle = proposal.project.project_title || "Project";
      const messageSent = `${CHAT_SYSTEM_MESSAGES.CONTRACT_TERMINATED_SENT} ${projectTitle}. Reason: ${trimmed}`;
      const messageReceived = `${CHAT_SYSTEM_MESSAGES.CONTRACT_TERMINATED_RECEIVED} ${projectTitle}. Reason: ${trimmed}`;
      await ConversationService.syncSystemMessage(
        proposal.project.user_id,
        proposal.provider_id,
        "",
        {
          activityType: "contract_terminated",
          activityId: proposal.unique_id,
          projectTitle: proposal.project.project_title,
          reason: trimmed,
          messageSent,
          messageReceived
        },
        proposal.project.id,
        userId
      );

      return { success: true, message: "Contract terminated successfully" };
    } catch (error: any) {
      console.error("Terminate contract Error:", error);
      return { success: false, message: error.message || "Failed to terminate contract" };
    }
  }

  /**
   * Check if user has already submitted a proposal for a project
   */
  static async hasSubmittedProposal(
    userId: number,
    projectId: string
  ): Promise<ServiceResponse> {
    try {
      const project = await prisma.founderProject.findFirst({
        where: {
          unique_id: projectId,
          deleted_at: null
        }
      });

      if (!project) {
        return {
          success: false,
          message: "Project not found"
        };
      }

      const existingProposal = await (prisma as any).proposal.findFirst({
        where: {
          project_id: project.id,
          provider_id: userId
        },
        select: {
          id: true,
          unique_id: true,
          status: true
        }
      });

      return {
        success: true,
        message: "Proposal status checked successfully",
        data: {
          has_submitted: !!existingProposal,
          proposal: existingProposal || null
        }
      };
    } catch (error: any) {
      console.error("Check Proposal Error:", error);
      return {
        success: false,
        message: error.message || "Failed to check proposal status"
      };
    }
  }

  /**
   * Request modify (founder only): send a message to the service provider. Creates activity only; no status change.
   */
  static async requestModify(
    userId: number,
    proposalId: string,
    message: string
  ): Promise<ServiceResponse> {
    try {
      const proposal = await (prisma as any).proposal.findFirst({
        where: { unique_id: proposalId },
        include: { project: { select: { user_id: true, id: true, project_title: true, unique_id: true } } }
      });
      if (!proposal) {
        return { success: false, message: "Proposal not found" };
      }
      if (proposal.project.user_id !== userId) {
        return { success: false, message: "You don't have permission to request changes for this proposal" };
      }
      const trimmed = (message || '').trim();
      if (!trimmed) {
        return { success: false, message: "Message is required" };
      }
      await createProposalActivity(proposal.unique_id, 'REQUEST_MODIFY', { message: trimmed }, userId);

      await (prisma as any).proposal.update({
        where: { unique_id: proposalId },
        data: { remark: trimmed }
      });

      const projectTitle = proposal.project.project_title || "Project";
      await ConversationService.syncSystemMessage(
        proposal.project.user_id,
        proposal.provider_id,
        "",
        {
          activityType: "request_modify",
          activityId: proposal.unique_id,
          message: trimmed,
          projectTitle: proposal.project.project_title,
          messageSent: `${CHAT_SYSTEM_MESSAGES.REQUEST_MODIFY_SENT} ${projectTitle}`,
          messageReceived: `${CHAT_SYSTEM_MESSAGES.REQUEST_MODIFY_RECEIVED} ${projectTitle}`
        },
        proposal.project.id,
        proposal.project.user_id
      );

      return { success: true, message: "Request sent to the service provider" };
    } catch (error: any) {
      console.error("Request Modify Error:", error);
      return { success: false, message: error.message || "Failed to send request" };
    }
  }

  /**
   * Get proposal activities (founder or proposal provider only)
   */
  static async getProposalActivities(userId: number, proposalId: string): Promise<ServiceResponse> {
    try {
      const proposal = await (prisma as any).proposal.findFirst({
        where: { unique_id: proposalId },
        include: { project: { select: { user_id: true } } }
      });
      if (!proposal) {
        return { success: false, message: "Proposal not found" };
      }
      const isFounder = proposal.project.user_id === userId;
      const isProvider = proposal.provider_id === userId;
      if (!isFounder && !isProvider) {
        return { success: false, message: "You don't have permission to view this proposal's activities" };
      }
      const activities = await fetchProposalActivities(proposal.unique_id);
      return { success: true, data: activities, message: "Activities retrieved" };
    } catch (error: any) {
      console.error("Get Proposal Activities Error:", error);
      return { success: false, message: error.message || "Failed to get activities" };
    }
  }
}
