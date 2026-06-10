import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";
import { resolveAttachmentUrl, resolveAttachmentUrls, urlsOrPathsToAttachmentIds, markAttachmentsAttached } from '@services/attachmentService';
import { Log } from '@services/loggerService';
import { createProposalActivity, getProposalActivities as fetchProposalActivities } from './ProposalActivityService';
import { dispatch } from '@queues/Queue';
import { NotificationJob } from '../../jobs/NotificationJob';
import { NotificationEmailJob } from '../../jobs/NotificationEmailJob';
import { ConversationService } from '@module/chat/ConversationService';
import { CHAT_SYSTEM_MESSAGES } from '../../constants/chatSystemMessages';
import { BillingService } from '@module/billing/BillingService';
import { ProposalStatus, MilestoneStatus, MilestonePaymentStatus, InviteStatus } from '@constants/status';
import { getUserFullName } from '@utils/General';
import { appConfig } from '@config/app';

/**
 * Human-readable labels for proposal status.
 * Used when returning proposals (e.g. status_label) so the UI shows "Proposal Rejected" instead of "REJECTED".
 */
export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  SHORTLISTED: 'Shortlisted',
  OFFER_SENT: 'Offer sent',
  OFFER_ACCEPTED: 'Offer accepted',
  HIRED: 'Hired',
  TERMINATING: 'Terminating',
  REJECTED: 'Proposal Rejected',
  WITHDRAWN: 'Offer withdrawn',
  TERMINATED: 'Terminated',
  PROJECT_COMPLETED: 'Project completed'
};

export function getProposalStatusLabel(status: string | undefined | null): string {
  if (status == null || status === '') return '';
  return PROPOSAL_STATUS_LABELS[String(status).toUpperCase()] ?? status;
}

/** Build display remark from optional reason label + optional message (for UI and chat). */
function buildRemark(reasonLabel: string, reasonMessage?: string | null): string {
  const a = reasonLabel?.trim() ?? '';
  const b = reasonMessage?.trim() ?? '';
  if (a && b) return `${a}. ${b}`;
  return a || b;
}

type RemarkRole = 'founder' | 'freelancer';

/**
 * Build role-specific display messages + reason fields for both sides.
 * Stores pre-built messages with embedded actor name so each side sees proper context.
 * `founder_remark`/`freelancer_remark` are also used for chat sync (messageSent/messageReceived).
 */
function buildRemarkFields(
  actorRole: RemarkRole,
  actorName: string,
  actionSent: string,
  actionReceived: string,
  reasonKey?: string | null,
  reasonMessage?: string | null,
) {
  const rawRemark = buildRemark(reasonKey ?? '', reasonMessage) || null;
  const reasonKeyTrimmed = reasonKey?.trim() || null;

  const sentDisplay = rawRemark ? `${actionSent}. ${rawRemark}` : actionSent;
  const receivedDisplay = rawRemark
    ? `${actorName} ${actionReceived}. Reason: ${rawRemark}`
    : `${actorName} ${actionReceived}`;

  if (actorRole === 'founder') {
    return {
      founder_remark: sentDisplay,
      founder_reason: reasonKeyTrimmed,
      freelancer_remark: receivedDisplay,
    };
  }
  return {
    freelancer_remark: sentDisplay,
    freelancer_reason: reasonKeyTrimmed,
    founder_remark: receivedDisplay,
  };
}

/** NDA + offer data (from ProposalNda table or legacy proposal.nda JSON). Dates in API as ISO strings. */
export interface ProposalNdaData {
  offer_expires_at?: string | null;
  is_nda_signed?: boolean;
  nda_file_link?: string | null;
  nda_sent_at?: string | null;
  nda_signed_at?: string | null;
  nda_signed_file_link?: string | null;
  nda_downloaded_at?: string | null;
}

/** Read NDA from proposal.proposalNda (or legacy proposal.nda JSON). Returns same shape with dates as ISO strings. */
function getNda(proposal: any): ProposalNdaData | null {
  const row = proposal?.proposalNda;
  if (row) {
    return {
      offer_expires_at: row.offer_expires_at ? new Date(row.offer_expires_at).toISOString() : null,
      is_nda_signed: row.is_nda_signed ?? false,
      nda_file_link: row.nda_file_link ?? null,
      nda_sent_at: row.nda_sent_at ? new Date(row.nda_sent_at).toISOString() : null,
      nda_signed_at: row.nda_signed_at ? new Date(row.nda_signed_at).toISOString() : null,
      nda_signed_file_link: row.nda_signed_file_link ?? null,
      nda_downloaded_at: row.nda_downloaded_at ? new Date(row.nda_downloaded_at).toISOString() : null,
    };
  }
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

/** Flatten NDA from proposal.nda and resolve nda_file_link / nda_signed_file_link to URLs (attachment ids → protected URL). */
async function flattenNdaToProposal(proposal: any): Promise<any> {
  const nda = getNda(proposal);
  let offer_expires_at = nda?.offer_expires_at ?? null;
  const ndaSentAt = nda?.nda_sent_at;
  if ((offer_expires_at == null || offer_expires_at === '') && ndaSentAt) {
    const sent = new Date(ndaSentAt);
    const expires = new Date(sent);
    expires.setHours(expires.getHours() + getOfferExpiryHours());
    offer_expires_at = expires.toISOString();
  }
  const [ndaFileLinkUrl, ndaSignedFileLinkUrl] = await Promise.all([
    nda?.nda_file_link ? resolveAttachmentUrl(nda.nda_file_link, 'nda_file_link') : Promise.resolve(null),
    nda?.nda_signed_file_link ? resolveAttachmentUrl(nda.nda_signed_file_link, 'nda_signed_file_link') : Promise.resolve(null),
  ]);
  return {
    ...proposal,
    offer_expires_at,
    is_nda_signed: nda?.is_nda_signed ?? false,
    nda_file_link: (ndaFileLinkUrl || nda?.nda_file_link) ?? null,
    nda_sent_at: nda?.nda_sent_at ?? null,
    nda_signed_at: nda?.nda_signed_at ?? null,
    nda_signed_file_link: (ndaSignedFileLinkUrl || nda?.nda_signed_file_link) ?? null,
    nda_downloaded_at: nda?.nda_downloaded_at ?? null,
    status_label: getProposalStatusLabel(proposal.status)
  };
}

/** Build milestones array from Milestone table rows; deliverables from Deliverable table. */
async function milestonesFromRows(rows: any[] | null | undefined): Promise<any[]> {
  if (!Array.isArray(rows)) return [];
  // Fetch invoice_a status for funded milestones in one query
  const milestoneIds = rows.map((r: any) => r.id).filter(Boolean);
  const invoiceStatuses = milestoneIds.length > 0
    ? await (prisma as any).billingTransaction.findMany({
        where: { milestone_id: { in: milestoneIds }, type: 'payment' },
        select: { milestone_id: true, invoice_a_id: true, payer_invoice_id: true, receiver_invoice_id: true, unique_id: true, status: true }
      })
    : [];
  const invoiceMap = new Map<number, { invoiceSent: boolean; transactionUniqueId: string | null; paymentStatus: string; hasInvoiceA: boolean; hasInvoiceB: boolean; hasInvoiceC: boolean }>();
  for (const tx of invoiceStatuses) {
    invoiceMap.set(tx.milestone_id, {
      invoiceSent: tx.invoice_a_id != null,
      transactionUniqueId: tx.unique_id,
      paymentStatus: tx.status,
      hasInvoiceA: tx.invoice_a_id != null,
      hasInvoiceB: tx.receiver_invoice_id != null,
      hasInvoiceC: tx.payer_invoice_id != null,
    });
  }

  return Promise.all(rows
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map(async (row) => {
      const deliverables = await buildDeliverablesFromRow(row);
      const txInfo = invoiceMap.get(row.id);
      return {
        id: row.unique_id,
        milestoneId: row.id,
        title: row.title ?? '',
        description: row.description ?? undefined,
        amount: Number(row.amount ?? 0),
        dueDate: row.due_date ? new Date(row.due_date).toISOString()?.slice(0, 10) : undefined,
        deliverables,
        payment_status: row.payment_status ?? MilestonePaymentStatus.PENDING,
        milestone_status: row.status ?? MilestoneStatus.PENDING,
        submitted_file: [],
        is_approved: row.is_approved === true,
        remark: row.remark ?? undefined,
        invoice_sent: txInfo?.invoiceSent ?? false,
        transaction_unique_id: txInfo?.transactionUniqueId ?? null,
        billing_status: txInfo?.paymentStatus ?? null,
        has_invoice_a: txInfo?.hasInvoiceA ?? false,
        has_invoice_b: txInfo?.hasInvoiceB ?? false,
        has_invoice_c: txInfo?.hasInvoiceC ?? false,
      };
    }));
}

/** Build deliverables array from Deliverable table rows or fallback to JSON. */
async function buildDeliverablesFromRow(row: any): Promise<any[]> {
  const fromTable = row.deliverablesRow;
  if (Array.isArray(fromTable) && fromTable.length > 0) {
    return Promise.all(fromTable
      .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map(async (d: any) => {
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
            ? await Promise.all((d.submitted_file as any[]).map(async (f: any) => ({
                url: typeof f?.url === 'string' ? await resolveAttachmentUrl(f.url, 'attachments') : f?.url,
                name: f?.name ?? (typeof f?.url === 'string' ? f.url.split('/').pop() : 'file')
              })))
            : [],
          feedback: d.feedback ?? null
        };
      }));
  }
  return [];
}

/** Build milestones with submitted_file derived from deliverables (Deliverable table). */
async function milestonesFromRowsWithDocuments(rows: any[] | null | undefined): Promise<any[]> {
  if (!Array.isArray(rows)) return [];
  return Promise.all(rows
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map(async (row) => {
      const deliverables = await buildDeliverablesFromRow(row);
      const submittedFile = deliverables.flatMap((d: any) => (Array.isArray(d.submitted_file) ? d.submitted_file : []));
      return {
        id: row.unique_id,
        milestoneId: row.id,
        title: row.title ?? '',
        description: row.description ?? undefined,
        amount: Number(row.amount ?? 0),
        dueDate: row.due_date ? new Date(row.due_date).toISOString()?.slice(0, 10) : undefined,
        deliverables,
        payment_status: row.payment_status ?? MilestonePaymentStatus.PENDING,
        milestone_status: row.status ?? MilestoneStatus.PENDING,
        submitted_file: submittedFile,
        is_approved: row.is_approved === true,
        remark: row.remark ?? undefined
      };
    }));
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
      hours_required?: number | null;
      milestones?: any[];
      screening_answers: any[];
      attachments: string[];
    }
  ): Promise<ServiceResponse> {
    try {
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

      // Check if user already submitted (or drafted) a proposal for this project.
      // - Non-draft existing → reject: one real proposal per provider/project.
      // - Draft existing → convert it: update fields, flip is_draft=false, fire
      //   the same side effects below (chat, invite, counter).
      const existingProposal = await (prisma as any).proposal.findFirst({
        where: {
          project_id: project.id,
          provider_id: userId
        }
      });

      if (existingProposal && !existingProposal.is_draft) {
        return {
          success: false,
          message: "You have already submitted a proposal for this project"
        };
      }

      const wasDraft = !!existingProposal?.is_draft;

      // Create or promote-from-draft (milestones live in Milestone table only)
      const hoursRequired =
        data.hours_required != null && Number.isInteger(data.hours_required) && data.hours_required >= 0
          ? data.hours_required
          : null;
      const attachmentPaths = urlsOrPathsToAttachmentIds(data.attachments || []);
      const proposal = existingProposal
        ? await (prisma as any).proposal.update({
            where: { id: existingProposal.id },
            data: {
              cover_letter: data.cover_letter || '',
              proposed_amount: data.proposed_amount,
              payment_schedule: data.payment_schedule,
              hours_required: hoursRequired,
              screening_answers: data.screening_answers,
              attachments: attachmentPaths,
              status: 'PENDING',
              is_draft: false,
            }
          })
        : await (prisma as any).proposal.create({
            data: {
              project_id: project.id,
              provider_id: userId,
              cover_letter: data.cover_letter || '',
              proposed_amount: data.proposed_amount,
              payment_schedule: data.payment_schedule,
              hours_required: hoursRequired,
              screening_answers: data.screening_answers,
              attachments: attachmentPaths,
              status: 'PENDING',
              is_draft: false,
            }
          });

      // Mark proposal attachments as attached
      if (attachmentPaths.length > 0) {
        await markAttachmentsAttached(attachmentPaths, [userId, project.user_id]);
      }

      // For "byProject" payment: auto-create a single milestone with the full amount and a deliverable
      let milestones = data.milestones ?? [];
      if (data.payment_schedule === 'byProject' && milestones.length === 0) {
        milestones = [{
          title: project.project_title || 'Full Project',
          amount: data.proposed_amount,
          dueDate: null,
          description: 'Full project delivery',
          deliverables: [{ deliverable: 'Complete project delivery' }]
        }];
      }
      await ProposalService.syncProposalMilestonesToTable(proposal.id, project.id, milestones);

      // Check if user was invited to this project and update invite status to ACCEPTED
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
          data: { status: InviteStatus.ACCEPTED }
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

      const freelancerNameP = await getUserFullName(userId);
      const notificationTitle = `${freelancerNameP} submitted a proposal`;
      const notificationBody = `${freelancerNameP} submitted a proposal for "${projectTitle}".`;
      const notificationLink = `${appConfig.frontendUrl}/project/${project.unique_id}`;

      const notifData = { userId: project.user_id, type: 'PROPOSAL_RECEIVED' as const, notificationTitle, notificationBody: notificationBody ?? null, notificationLink: notificationLink ?? null, actorId: userId, subjectType: 'Proposal' as const, subjectId: proposal.id };
      await dispatch(NotificationJob, notifData);
      await dispatch(NotificationEmailJob, notifData);

      return {
        success: true,
        message: "Proposal submitted successfully",
        data: {
          id: proposal.id,
          unique_id: proposal.unique_id
        }
      };
    } catch (error: any) {
      Log.error("Create Proposal Error", { error });
      return {
        success: false,
        message: error.message || "Failed to submit proposal"
      };
    }
  }

  /**
   * Save (or update) a proposal draft. Drafts are hidden from the founder
   * (filtered out of founder-facing queries) and do not trigger the chat
   * sync, invite flip, proposals_count increment, or notifications. A
   * provider can save multiple times — the draft is upserted by
   * (project_id, provider_id). Once they click "Submit", createProposal
   * converts the draft by flipping is_draft=false and running the usual
   * side effects.
   */
  static async saveDraftProposal(
    userId: number,
    projectId: string,
    data: {
      cover_letter?: string;
      proposed_amount?: number;
      payment_schedule?: string;
      hours_required?: number | null;
      milestones?: any[];
      screening_answers?: any[];
      attachments?: string[];
    }
  ): Promise<ServiceResponse> {
    try {
      const project = await prisma.founderProject.findFirst({
        where: {
          unique_id: projectId,
          status: 'PUBLISHED',
          deleted_at: null
        }
      });

      if (!project) {
        return { success: false, message: "Project not found or not available" };
      }

      if (project.user_id === userId) {
        return { success: false, message: "You cannot save a draft proposal for your own project" };
      }

      const existingProposal = await (prisma as any).proposal.findFirst({
        where: { project_id: project.id, provider_id: userId }
      });

      // Can't save a draft on top of a proposal that's already been submitted.
      if (existingProposal && !existingProposal.is_draft) {
        return {
          success: false,
          message: "You have already submitted a proposal for this project"
        };
      }

      const hoursRequired =
        data.hours_required != null && Number.isInteger(data.hours_required) && data.hours_required >= 0
          ? data.hours_required
          : null;
      const attachmentPaths = urlsOrPathsToAttachmentIds(data.attachments || []);

      const draft = existingProposal
        ? await (prisma as any).proposal.update({
            where: { id: existingProposal.id },
            data: {
              cover_letter: data.cover_letter || '',
              proposed_amount: data.proposed_amount ?? 0,
              payment_schedule: data.payment_schedule || 'byProject',
              hours_required: hoursRequired,
              screening_answers: data.screening_answers ?? [],
              attachments: attachmentPaths,
              status: 'PENDING',
              is_draft: true,
            }
          })
        : await (prisma as any).proposal.create({
            data: {
              project_id: project.id,
              provider_id: userId,
              cover_letter: data.cover_letter || '',
              proposed_amount: data.proposed_amount ?? 0,
              payment_schedule: data.payment_schedule || 'byProject',
              hours_required: hoursRequired,
              screening_answers: data.screening_answers ?? [],
              attachments: attachmentPaths,
              status: 'PENDING',
              is_draft: true,
            }
          });

      if (attachmentPaths.length > 0) {
        await markAttachmentsAttached(attachmentPaths, [userId, project.user_id]);
      }

      // Keep the draft's milestones in sync so when it's promoted to a real
      // proposal later, they're already on the Milestone table.
      const milestones = Array.isArray(data.milestones) ? data.milestones : [];
      await ProposalService.syncProposalMilestonesToTable(draft.id, project.id, milestones);

      return {
        success: true,
        message: "Your proposal has been saved as a draft.",
        data: {
          id: draft.id,
          unique_id: draft.unique_id
        }
      };
    } catch (error: any) {
      Log.error("Save Draft Proposal Error", { error });
      return {
        success: false,
        message: error.message || "Could not save your proposal draft. Please try again."
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
            data: { ...row, status: MilestoneStatus.PENDING }
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
              Log.error('Deliverable upsert error', { err });
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
            Log.error('Deliverable deleteMany error', { err });
          }
        }
      } catch (err) {
        Log.error(`Milestone sync failed for proposal_id=${proposalId} order_index=${i}`, { err });
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
      if (status === ProposalStatus.PROJECT_COMPLETED) {
        return { success: false, message: "You cannot add milestones after the project is completed" };
      }
      if (status !== ProposalStatus.OFFER_ACCEPTED && status !== ProposalStatus.HIRED) {
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
          status: MilestoneStatus.PENDING,
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
      Log.error("Add Milestone Error", { error });
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
          proposalNda: true,
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
      const transformedProposals = await Promise.all(proposals.map(async (proposal: any) =>
        await flattenNdaToProposal({
          ...proposal,
          milestones: await milestonesFromRows(proposal.milestonesRows),
          attachments: await resolveAttachmentUrls(proposal.attachments || [], 'attachments'),
          project: proposal.project ? {
            ...proposal.project,
            budget_currency: proposal.project.user?.currency?.symbol || '₹'
          } : null
        })
      ));

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
      Log.error("Get My Proposals Error", { error });
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
        project_id: project.id,
        // Founder never sees drafts. Provider viewing their own row through
        // this endpoint is fine because we only show them their own proposal,
        // and getProposal/useProposal (/proposals/:id) is the canonical way
        // for a provider to load their draft for editing.
        is_draft: false
      };

      if (!isOwner) {
        const hasProposal = await (prisma as any).proposal.findFirst({
          where: { project_id: project.id, provider_id: userId, is_draft: false }
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
          proposalNda: true,
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
      const transformedProposals = await Promise.all(proposals.map(async (proposal: any) => {
        const providerProfileImage = proposal.provider?.personalInfo?.profileImage
          ? await resolveAttachmentUrl(proposal.provider.personalInfo.profileImage, 'profile_image')
          : null;
        return await flattenNdaToProposal({
          ...proposal,
          milestones: await milestonesFromRows(proposal.milestonesRows),
          attachments: await resolveAttachmentUrls(proposal.attachments || [], 'attachments'),
          provider: proposal.provider ? {
            ...proposal.provider,
            personalInfo: proposal.provider.personalInfo ? {
              ...proposal.provider.personalInfo,
              profileImage: providerProfileImage
            } : null
          } : null
        });
      }));

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
      Log.error("Get Proposals By Project Error", { error });
      return {
        success: false,
        message: error.message || "Failed to retrieve proposals"
      };
    }
  }

  /**
   * Get founder's proposals by contract status (SHORTLISTED, OFFER_SENT, OFFER_ACCEPTED, HIRED, REJECTED, TERMINATED, WITHDRAWN).
   */
  static async getFounderContracts(
    userId: number,
    status: 'SHORTLISTED' | 'OFFER_SENT' | 'OFFER_ACCEPTED' | 'HIRED' | 'TERMINATING' | 'REJECTED' | 'TERMINATED' | 'WITHDRAWN',
    page: number = 1,
    limit: number = 20
  ): Promise<ServiceResponse> {
    try {
      // Hired tab includes HIRED, TERMINATING, and PROJECT_COMPLETED so all can view offer and project overview
      const statusFilter = status === ProposalStatus.HIRED
        ? { in: [ProposalStatus.HIRED, ProposalStatus.TERMINATING, ProposalStatus.PROJECT_COMPLETED] as const }
        : status;
      const whereClause = {
        status: statusFilter,
        // Drafts never appear on the founder side
        is_draft: false,
        project: {
          user_id: userId,
          deleted_at: null
        }
      };

      const totalCount = await (prisma as any).proposal.count({ where: whereClause });

      const proposals = await (prisma as any).proposal.findMany({
        where: whereClause,
        include: {
          proposalNda: true,
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

      const transformedProposals = await Promise.all(proposals.map(async (proposal: any) => {
        const providerProfileImage = proposal.provider?.personalInfo?.profileImage
          ? await resolveAttachmentUrl(proposal.provider.personalInfo.profileImage, 'profile_image')
          : null;
        return await flattenNdaToProposal({
          ...proposal,
          milestones: await milestonesFromRows(proposal.milestonesRows),
          attachments: await resolveAttachmentUrls(proposal.attachments || [], 'attachments'),
          provider: proposal.provider ? {
            ...proposal.provider,
            personalInfo: proposal.provider.personalInfo ? {
              ...proposal.provider.personalInfo,
              profileImage: providerProfileImage
            } : null
          } : null
        });
      }));

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
      Log.error("Get Founder Contracts Error", { error });
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
          proposalNda: true,
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

      // If status is TERMINATING and the date has passed, apply termination now
      const terminateAt = proposal.terminate_at ? new Date(proposal.terminate_at) : null;
      if (proposal.status === ProposalStatus.TERMINATING && terminateAt && terminateAt <= new Date()) {
        await (prisma as any).proposal.update({
          where: { id: proposal.id },
          data: { status: ProposalStatus.TERMINATED, terminate_at: null, terminate_by: null }
        });
        (proposal as any).status = ProposalStatus.TERMINATED;
        (proposal as any).terminate_at = null;
        (proposal as any).terminate_by = null;
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
      const [milestones, attachments, projectUserProfileImage, providerProfileImage] = await Promise.all([
        milestonesFromRowsWithDocuments(proposal.milestonesRows),
        resolveAttachmentUrls(proposal.attachments || [], 'proposal_attachments'),
        projectUser?.personalInfo?.profileImage
          ? resolveAttachmentUrl(projectUser.personalInfo.profileImage, 'profile_image')
          : Promise.resolve(null),
        proposal.provider?.personalInfo?.profileImage
          ? resolveAttachmentUrl(proposal.provider.personalInfo.profileImage, 'profile_image')
          : Promise.resolve(null),
      ]);
      const transformedProposal: any = {
        ...proposal,
        milestones,
        attachments: attachments,
        milestonesRows: proposal.milestonesRows ?? [],
        project: proposal.project ? {
          ...proposal.project,
          budget_currency: proposal.project.user?.currency?.symbol || '₹',
          user: projectUser ? {
            ...projectUser,
            personalInfo: projectUser.personalInfo ? {
              ...projectUser.personalInfo,
              profileImage: projectUserProfileImage
            } : null
          } : null
        } : null,
        provider: proposal.provider ? {
          ...proposal.provider,
          personalInfo: proposal.provider.personalInfo ? {
            ...proposal.provider.personalInfo,
            profileImage: providerProfileImage
          } : null
        } : null
      };

      // Founder view: add 24h hire cooldown (can't hire another for 24h after accepting one)
      if (isProjectOwner) {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const lastAccepted = await (prisma as any).proposal.findFirst({
          where: {
            project: { user_id: userId },
            status: ProposalStatus.SHORTLISTED,
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
        data: await flattenNdaToProposal(transformedProposal)
      };
    } catch (error: any) {
      Log.error("Get Proposal By ID Error", { error });
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
      hours_required?: number | null;
      milestones?: any[];
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
      if (proposal.status !== ProposalStatus.PENDING) {
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
      const hoursRequired =
        data.hours_required !== undefined
          ? (data.hours_required != null && Number.isInteger(data.hours_required) && data.hours_required >= 0
              ? data.hours_required
              : null)
          : undefined;
      await (prisma as any).proposal.update({
        where: { id: proposal.id },
        data: {
          cover_letter: data.cover_letter ?? proposal.cover_letter,
          proposed_amount: data.proposed_amount,
          payment_schedule: data.payment_schedule,
          ...(hoursRequired !== undefined && { hours_required: hoursRequired }),
          screening_answers: data.screening_answers,
          ...(data.attachments !== undefined && {
            attachments: urlsOrPathsToAttachmentIds(data.attachments || [])
          }),
          founder_remark: null,
          founder_reason: null,
          freelancer_remark: null,
          freelancer_reason: null // Clear when freelancer updates proposal
        }
      });
      // Mark updated attachments as attached
      if (data.attachments !== undefined) {
        const updatedAttachmentIds = urlsOrPathsToAttachmentIds(data.attachments || []);
        if (updatedAttachmentIds.length > 0) {
          await markAttachmentsAttached(updatedAttachmentIds, [userId, proposal.project.user_id]);
        }
      }
      // For "byProject" payment: auto-create a single milestone with the full amount and a deliverable
      let updateMilestones = data.milestones ?? [];
      if (data.payment_schedule === 'byProject' && updateMilestones.length === 0) {
        updateMilestones = [{
          title: proposal.project?.project_title || 'Full Project',
          amount: data.proposed_amount,
          dueDate: null,
          description: 'Full project delivery',
          deliverables: [{ deliverable: 'Complete project delivery' }]
        }];
      }
      await ProposalService.syncProposalMilestonesToTable(proposal.id, proposal.project_id, updateMilestones);

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
      Log.error("Update Proposal Error", { error });
      return { success: false, message: error.message || "Failed to update proposal" };
    }
  }

  /**
   * Update proposal status (founder only).
   * SHORTLISTED = proposal shortlisted (accepted); REJECTED = rejected; ARCHIVED = ignored (no notification).
   * OFFER_SENT is set when founder sends the NDA (in updateProposalNda), not here.
   * When rejecting, reason_key (from constants) and/or reason_message required; stored in remark (label + message).
   */
  static async updateProposalStatus(
    userId: number,
    proposalId: string,
    status: 'SHORTLISTED' | 'REJECTED' | 'ARCHIVED',
    rejection?: { reason_key?: string; reason_message?: string }
  ): Promise<ServiceResponse> {
    try {
      if (status === 'REJECTED') {
        const key = rejection?.reason_key?.trim();
        const msg = rejection?.reason_message?.trim();
        if (!key && !msg) {
          return { success: false, message: "Reason or reason message for rejection is required" };
        }
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
              unique_id: true,
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

      let remarkFields: ReturnType<typeof buildRemarkFields> | null = null;
      if (status === 'REJECTED') {
        const rejectionReason = rejection?.reason_key?.trim() || null;
        const rejectionMsg = rejection?.reason_message?.trim() || null;
        const founderName = await getUserFullName(userId);
        remarkFields = buildRemarkFields(
          'founder', founderName,
          'You rejected the proposal',
          'rejected your proposal',
          rejectionReason, rejectionMsg,
        );
        await (prisma as any).proposal.update({
          where: { id: proposal.id },
          data: { status: ProposalStatus.REJECTED, ...remarkFields }
        });
      } else {
        await (prisma as any).proposal.update({
          where: { id: proposal.id },
          data: { status }
        });
      }

      // ARCHIVED = ignore: no activity, no chat sync, no notification
      if (status !== ProposalStatus.ARCHIVED) {
        await createProposalActivity(proposal.unique_id, 'STATUS_CHANGE', {
          oldStatus: proposal.status,
          newStatus: status,
          ...(remarkFields?.founder_remark ? { message: remarkFields.founder_remark } : {}),
          ...(remarkFields?.founder_reason ? { main_reason: remarkFields.founder_reason } : {})
        }, userId);

        // Sync to chat: use role-specific remark fields
        const messageSent = status === ProposalStatus.SHORTLISTED
          ? CHAT_SYSTEM_MESSAGES.PROPOSAL_ACCEPTED_SENT
          : (remarkFields?.founder_remark ?? CHAT_SYSTEM_MESSAGES.PROPOSAL_REJECTED_SENT);
        const messageReceived = status === ProposalStatus.SHORTLISTED
          ? CHAT_SYSTEM_MESSAGES.PROPOSAL_ACCEPTED_RECEIVED
          : (remarkFields?.freelancer_remark ?? CHAT_SYSTEM_MESSAGES.PROPOSAL_REJECTED_RECEIVED);
        const metadata: Record<string, unknown> = {
          activityType: "proposal_status",
          activityId: proposal.unique_id,
          newStatus: status,
          messageSent,
          messageReceived
        };
        await ConversationService.syncSystemMessage(
          proposal.project.user_id,
          proposal.provider_id,
          "",
          metadata,
          proposal.project.id,
          proposal.project.user_id
        );

        const projectTitle = proposal.project.project_title || 'Project';
        const notificationLink = `${appConfig.frontendUrl}/project/${proposal.project.unique_id}`;
        if (status === ProposalStatus.SHORTLISTED) {
          const notifData = { userId: proposal.provider_id, type: 'PROPOSAL_ACCEPTED' as const, notificationTitle: 'Proposal shortlisted', notificationBody: `Your proposal for "${projectTitle}" was shortlisted.`, notificationLink: notificationLink ?? null, actorId: userId, subjectType: 'Proposal' as const, subjectId: proposal.id };
          await dispatch(NotificationJob, notifData);
          await dispatch(NotificationEmailJob, notifData);
        } else {
        const notifData = { userId: proposal.provider_id, type: 'PROPOSAL_REJECTED' as const, notificationTitle: 'Proposal rejected', notificationBody: remarkFields?.freelancer_remark ? `Your proposal for "${projectTitle}" was rejected. Reason: ${remarkFields.freelancer_remark}` : `Your proposal for "${projectTitle}" was rejected.`, notificationLink: notificationLink ?? null, actorId: userId, subjectType: 'Proposal' as const, subjectId: proposal.id };
        await dispatch(NotificationJob, notifData);
        await dispatch(NotificationEmailJob, notifData);
        }
      }

      return {
        success: true,
        message: `Proposal ${status.toLowerCase()} successfully`
      };
    } catch (error: any) {
      Log.error("Update Proposal Status Error", { error });
      return {
        success: false,
        message: error.message || "Failed to update proposal status"
      };
    }
  }

  /**
   * Cancel hire (withdraw offer). Allowed only when status is SHORTLISTED and NDA is not signed.
   */
  static async cancelHire(
    userId: number,
    proposalId: string,
    body: { reason?: string; reason_message?: string }
  ): Promise<ServiceResponse> {
    try {
      const proposal = await (prisma as any).proposal.findFirst({
        where: { unique_id: proposalId },
        include: {
          proposalNda: true,
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
      if (proposal.status !== ProposalStatus.OFFER_SENT) {
        return { success: false, message: "Only an offer that has been sent (and not yet accepted via NDA) can be withdrawn" };
      }
      const nda = getNda(proposal);
      if (nda?.is_nda_signed === true) {
        return { success: false, message: "Cannot withdraw offer after the freelancer has signed the NDA" };
      }

      const reason = body.reason?.trim();
      const reasonMsg = body.reason_message?.trim() || null;

      const founderNameCH = await getUserFullName(userId);
      const remarkFields = buildRemarkFields(
        'founder', founderNameCH,
        'You withdrew the offer',
        'withdrew the offer',
        reason, reasonMsg,
      );
      await (prisma as any).proposal.update({
        where: { id: proposal.id },
        data: { status: ProposalStatus.WITHDRAWN, ...remarkFields }
      });
      const toDateOrNull = (v: string | null | undefined): Date | null =>
        v == null || v === '' ? null : new Date(v);
      const nextNda = { ...(nda || {}), offer_expires_at: null };
      await (prisma as any).proposalNda.upsert({
        where: { proposal_id: proposal.id },
        create: {
          proposal_id: proposal.id,
          offer_expires_at: null,
          is_nda_signed: nextNda.is_nda_signed ?? false,
          nda_file_link: nextNda.nda_file_link ?? null,
          nda_sent_at: toDateOrNull(nextNda.nda_sent_at ?? undefined),
          nda_signed_at: toDateOrNull(nextNda.nda_signed_at ?? undefined),
          nda_signed_file_link: nextNda.nda_signed_file_link ?? null,
          nda_downloaded_at: toDateOrNull(nextNda.nda_downloaded_at ?? undefined),
        },
        update: {
          offer_expires_at: null,
          is_nda_signed: nextNda.is_nda_signed ?? false,
          nda_file_link: nextNda.nda_file_link ?? null,
          nda_sent_at: toDateOrNull(nextNda.nda_sent_at ?? undefined),
          nda_signed_at: toDateOrNull(nextNda.nda_signed_at ?? undefined),
          nda_signed_file_link: nextNda.nda_signed_file_link ?? null,
          nda_downloaded_at: toDateOrNull(nextNda.nda_downloaded_at ?? undefined),
        },
      });

      await createProposalActivity(proposal.unique_id, 'STATUS_CHANGE', {
        oldStatus: ProposalStatus.OFFER_SENT,
        newStatus: ProposalStatus.WITHDRAWN,
        message: remarkFields.founder_remark ?? undefined,
        ...(remarkFields.founder_reason ? { main_reason: remarkFields.founder_reason } : {})
      }, userId);

      const projectTitle = proposal.project.project_title || "Project";
      await ConversationService.syncSystemMessage(
        proposal.project.user_id,
        proposal.provider_id,
        "",
        {
          activityType: "offer_cancelled",
          activityId: proposal.unique_id,
          messageSent: remarkFields.founder_remark,
          messageReceived: remarkFields.freelancer_remark
        },
        proposal.project.id,
        proposal.project.user_id
      );

      const withdrawOfferLink = `${appConfig.frontendUrl}/proposals-and-offers/${proposal.unique_id}`;
      const notifData = { userId: proposal.provider_id, type: 'INTERVIEW_OR_OFFER_DECLINED_WITHDRAWN' as const, notificationTitle: `${founderNameCH} withdrew the offer`, notificationBody: `${founderNameCH} withdrew the offer for "${projectTitle}".`, notificationLink: withdrawOfferLink ?? null, actorId: userId, subjectType: 'Proposal' as const, subjectId: proposal.id };
      await dispatch(NotificationJob, notifData);
      await dispatch(NotificationEmailJob, notifData);

      return {
        success: true,
        message: "Offer withdrawn successfully"
      };
    } catch (error: any) {
      Log.error("Cancel hire Error", { error });
      return {
        success: false,
        message: error.message || "Failed to withdraw offer"
      };
    }
  }

  /**
   * Decline offer (freelancer only). Allowed only when status is OFFER_SENT. Sets status to REJECTED, stores reason_key + remark, syncs to chat.
   */
  static async declineOffer(
    userId: number,
    proposalId: string,
    body: { reason?: string; reason_message?: string }
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
      if (proposal.status !== ProposalStatus.OFFER_SENT) {
        return { success: false, message: "Only an offer that has been sent can be declined" };
      }

      const reason = body.reason?.trim();
      const reasonMsg = body.reason_message?.trim() || null;

      const freelancerNameDO = await getUserFullName(userId);
      const remarkFields = buildRemarkFields(
        'freelancer', freelancerNameDO,
        'You declined the offer',
        'declined the offer',
        reason, reasonMsg,
      );
      await (prisma as any).proposal.update({
        where: { id: proposal.id },
        data: { status: ProposalStatus.REJECTED, ...remarkFields }
      });

      await createProposalActivity(proposal.unique_id, 'STATUS_CHANGE', {
        oldStatus: ProposalStatus.OFFER_SENT,
        newStatus: ProposalStatus.REJECTED,
        message: remarkFields.freelancer_remark ?? undefined,
        ...(remarkFields.freelancer_reason ? { main_reason: remarkFields.freelancer_reason } : {})
      }, userId);

      const projectTitle = proposal.project?.project_title || "Project";
      await ConversationService.syncSystemMessage(
        proposal.project.user_id,
        proposal.provider_id,
        "",
        {
          activityType: "offer_declined",
          activityId: proposal.unique_id,
          messageSent: remarkFields.freelancer_remark,
          messageReceived: remarkFields.founder_remark
        },
        proposal.project.id,
        userId
      );

      const declineOfferLink = `${appConfig.frontendUrl}/proposals-and-offers/${proposal.unique_id}`;
      const notifData = { userId: proposal.project.user_id, type: 'INTERVIEW_OR_OFFER_DECLINED_WITHDRAWN' as const, notificationTitle: `${freelancerNameDO} declined your offer`, notificationBody: `${freelancerNameDO} declined your offer for "${projectTitle}".`, notificationLink: declineOfferLink ?? null, actorId: userId, subjectType: 'Proposal' as const, subjectId: proposal.id };
      await dispatch(NotificationJob, notifData);
      await dispatch(NotificationEmailJob, notifData);

      return { success: true, message: "Offer declined successfully" };
    } catch (error: any) {
      Log.error("Decline offer Error", { error });
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
      if (proposal.status !== ProposalStatus.OFFER_ACCEPTED) {
        return { success: false, message: "You can only hire after the freelancer has signed the NDA (offer accepted)" };
      }

      return {
        success: false,
        message: "Hire is completed when you complete the first payment. Please use the payment screen to hire."
      };
    } catch (error: any) {
      Log.error("Set hire Error", { error });
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
      if (proposal.status === ProposalStatus.PROJECT_COMPLETED) {
        return { success: true, message: "Project is already marked as completed" };
      }
      if (proposal.status === ProposalStatus.TERMINATING) {
        return { success: false, message: "Cannot mark project completed while contract is scheduled to terminate. Restore the contract first." };
      }
      if (proposal.status !== ProposalStatus.HIRED) {
        return { success: false, message: "Project can only be marked completed when the contract is hired" };
      }
      const rows = proposal.milestonesRows ?? [];
      const allDone = rows.length > 0 && rows.every((m: any) => {
        const s = String(m.status ?? "").toUpperCase();
        return s === MilestoneStatus.PAID || s === MilestoneStatus.COMPLETED;
      });
      if (!allDone) {
        return { success: false, message: "Complete and pay all milestones before marking the project as completed" };
      }

      await createProposalActivity(proposal.unique_id, "STATUS_CHANGE", {
        oldStatus: proposal.status,
        newStatus: ProposalStatus.PROJECT_COMPLETED
      }, userId);

      await (prisma as any).proposal.update({
        where: { id: proposal.id },
        data: { status: ProposalStatus.PROJECT_COMPLETED }
      });

      return { success: true, message: "Project marked as completed" };
    } catch (error: any) {
      Log.error("Mark project completed Error", { error });
      return { success: false, message: error.message || "Failed to mark project as completed" };
    }
  }

  /**
   * Check if freelancer has verified bank info and Razorpay linked account.
   * Must be done before accepting a contract so payments can be processed.
   */
  private static async checkFreelancerBankInfo(userId: number): Promise<ServiceResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { razorpay_account_id: true, razorpay_agency_account_id: true, show_as_agency: true }
    });
    const requiredAccountId = user?.show_as_agency
      ? user.razorpay_agency_account_id
      : user?.razorpay_account_id;
    if (!requiredAccountId) {
      const entityType = user?.show_as_agency ? 'AGENCY' : 'INDIVIDUAL';
      const bankInfo = await (prisma as any).bankInformation.findFirst({
        where: { user_id: userId, entity_type: entityType, verification_status: 'verified' }
      });
      if (!bankInfo) {
        return {
          success: false,
          message: `Please add and verify your ${user?.show_as_agency ? 'agency ' : ''}bank information before accepting a contract. Go to Settings → Bank Information.`
        };
      }
      return {
        success: false,
        message: 'Your bank account is verified but Razorpay account linking is not complete. Please contact support.'
      };
    }
    return { success: true, message: '' };
  }

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
      /** When true and project has no NDA: founder sends offer (SHORTLISTED -> OFFER_SENT). */
      send_offer?: boolean;
      /** When true and project has no NDA: freelancer accepts offer (OFFER_SENT -> OFFER_ACCEPTED). */
      accept_offer?: boolean;
    }
  ): Promise<ServiceResponse> {
    try {
      const proposal = await (prisma as any).proposal.findFirst({
        where: { unique_id: proposalId },
        include: {
          proposalNda: true,
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

      // Founder: send offer when NDA not required (SHORTLISTED/PENDING -> OFFER_SENT)
      if (isFounder && !isNdaRequired && data.send_offer === true && (proposal.status === ProposalStatus.SHORTLISTED || proposal.status === ProposalStatus.PENDING)) {
        const otherActive = await (prisma as any).proposal.count({
          where: {
            project_id: proposal.project_id,
            status: { in: [ProposalStatus.OFFER_SENT, ProposalStatus.OFFER_ACCEPTED] },
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
          data: { status: ProposalStatus.OFFER_SENT }
        });
        const toDateOrNullNda = (v: string | null | undefined): Date | null =>
          v == null || v === '' ? null : new Date(v);
        await (prisma as any).proposalNda.upsert({
          where: { proposal_id: proposal.id },
          create: {
            proposal_id: proposal.id,
            offer_expires_at: expiresAt,
            is_nda_signed: ndaUpdate.is_nda_signed ?? false,
            nda_file_link: ndaUpdate.nda_file_link ?? null,
            nda_sent_at: toDateOrNullNda(ndaUpdate.nda_sent_at ?? undefined),
            nda_signed_at: toDateOrNullNda(ndaUpdate.nda_signed_at ?? undefined),
            nda_signed_file_link: ndaUpdate.nda_signed_file_link ?? null,
            nda_downloaded_at: toDateOrNullNda(ndaUpdate.nda_downloaded_at ?? undefined),
          },
          update: {
            offer_expires_at: expiresAt,
            is_nda_signed: ndaUpdate.is_nda_signed ?? false,
            nda_file_link: ndaUpdate.nda_file_link ?? null,
            nda_sent_at: toDateOrNullNda(ndaUpdate.nda_sent_at ?? undefined),
            nda_signed_at: toDateOrNullNda(ndaUpdate.nda_signed_at ?? undefined),
            nda_signed_file_link: ndaUpdate.nda_signed_file_link ?? null,
            nda_downloaded_at: toDateOrNullNda(ndaUpdate.nda_downloaded_at ?? undefined),
          },
        });
        await createProposalActivity(proposal.unique_id, 'STATUS_CHANGE', { oldStatus: proposal.status, newStatus: ProposalStatus.OFFER_SENT }, userId);
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
        const projectTitle = proposal.project?.project_title || "Project";
        const offerSentLink = `${appConfig.frontendUrl}/proposals-and-offers/${proposal.unique_id}`;
        const notifData = { userId: proposal.provider_id, type: 'OFFER_SENT' as const, notificationTitle: 'Offer sent', notificationBody: `You received an offer for "${projectTitle}".`, notificationLink: offerSentLink ?? null, actorId: userId, subjectType: 'Proposal' as const, subjectId: proposal.id };
        await dispatch(NotificationJob, notifData);
        await dispatch(NotificationEmailJob, notifData);
        return { success: true, message: "Offer sent" };
      }

      // Freelancer: accept offer when NDA not required (OFFER_SENT -> OFFER_ACCEPTED)
      if (isProvider && !isNdaRequired && data.accept_offer === true && proposal.status === ProposalStatus.OFFER_SENT) {
        // Check freelancer has verified bank info and Razorpay linked account
        const bankCheck = await this.checkFreelancerBankInfo(userId);
        if (!bankCheck.success) return bankCheck;

        await (prisma as any).proposal.update({
          where: { id: proposal.id },
          data: { status: ProposalStatus.OFFER_ACCEPTED }
        });
        await createProposalActivity(proposal.unique_id, 'STATUS_CHANGE', { oldStatus: ProposalStatus.OFFER_SENT, newStatus: ProposalStatus.OFFER_ACCEPTED }, userId);
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
        const freelancerNameAccept = await getUserFullName(userId);
        const projectTitleAccept = proposal.project?.project_title || "Project";
        const offerAcceptedLink = `${appConfig.frontendUrl}/proposals-and-offers/${proposal.unique_id}`;
        const notifData = { userId: proposal.project.user_id, type: 'OFFER_ACCEPTED' as const, notificationTitle: `${freelancerNameAccept} accepted your offer`, notificationBody: `${freelancerNameAccept} accepted your offer for "${projectTitleAccept}".`, notificationLink: offerAcceptedLink ?? null, actorId: userId, subjectType: 'Proposal' as const, subjectId: proposal.id };
        await dispatch(NotificationJob, notifData);
        await dispatch(NotificationEmailJob, notifData);
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
      if (isFounder && data.nda_file_link !== undefined && (proposal.status === ProposalStatus.PENDING || proposal.status === ProposalStatus.SHORTLISTED)) {
        const otherActive = await (prisma as any).proposal.count({
          where: {
            project_id: proposal.project_id,
            status: { in: [ProposalStatus.OFFER_SENT, ProposalStatus.OFFER_ACCEPTED] },
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

      const toDateOrNull = (v: string | null | undefined): Date | null =>
        v == null || v === '' ? null : new Date(v);
      await (prisma as any).proposalNda.upsert({
        where: { proposal_id: proposal.id },
        create: {
          proposal_id: proposal.id,
          offer_expires_at: toDateOrNull(current.offer_expires_at ?? undefined),
          is_nda_signed: current.is_nda_signed ?? false,
          nda_file_link: current.nda_file_link ?? null,
          nda_sent_at: toDateOrNull(current.nda_sent_at ?? undefined),
          nda_signed_at: toDateOrNull(current.nda_signed_at ?? undefined),
          nda_signed_file_link: current.nda_signed_file_link ?? null,
          nda_downloaded_at: toDateOrNull(current.nda_downloaded_at ?? undefined),
        },
        update: {
          offer_expires_at: toDateOrNull(current.offer_expires_at ?? undefined),
          is_nda_signed: current.is_nda_signed ?? false,
          nda_file_link: current.nda_file_link ?? null,
          nda_sent_at: toDateOrNull(current.nda_sent_at ?? undefined),
          nda_signed_at: toDateOrNull(current.nda_signed_at ?? undefined),
          nda_signed_file_link: current.nda_signed_file_link ?? null,
          nda_downloaded_at: toDateOrNull(current.nda_downloaded_at ?? undefined),
        },
      });

      // Grant file access to both parties so they can download NDA documents
      const ndaAttachmentIds = urlsOrPathsToAttachmentIds(
        [current.nda_file_link, current.nda_signed_file_link].filter(Boolean) as string[]
      );
      if (ndaAttachmentIds.length > 0) {
        await markAttachmentsAttached(ndaAttachmentIds, [proposal.project.user_id, proposal.provider_id]);
      }

      // When founder sends the NDA (uploads nda_file_link), set status to OFFER_SENT
      const didJustSendOffer = isFounder && data.nda_file_link !== undefined && (proposal.status === ProposalStatus.PENDING || proposal.status === ProposalStatus.SHORTLISTED);
      if (didJustSendOffer) {
        await createProposalActivity(proposal.unique_id, 'STATUS_CHANGE', {
          oldStatus: proposal.status,
          newStatus: ProposalStatus.OFFER_SENT
        }, userId);
        await (prisma as any).proposal.update({
          where: { id: proposal.id },
          data: { status: ProposalStatus.OFFER_SENT }
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
        const projectTitleNda = proposal.project?.project_title || "Project";
        const offerSentLinkNda = `${appConfig.frontendUrl}/proposals-and-offers/${proposal.unique_id}`;
        const notifData = { userId: proposal.provider_id, type: 'OFFER_SENT' as const, notificationTitle: 'Offer sent', notificationBody: `You received an offer for "${projectTitleNda}".`, notificationLink: offerSentLinkNda ?? null, actorId: userId, subjectType: 'Proposal' as const, subjectId: proposal.id };
        await dispatch(NotificationJob, notifData);
        await dispatch(NotificationEmailJob, notifData);
      }

      // When freelancer signs NDA, move status from OFFER_SENT to OFFER_ACCEPTED (so founder can proceed to payment)
      if (isProvider && (data.is_nda_signed === true || data.nda_signed_file_link) && proposal.status === ProposalStatus.OFFER_SENT) {
        // Check freelancer has verified bank info and Razorpay linked account
        const bankCheck = await this.checkFreelancerBankInfo(userId);
        if (!bankCheck.success) return bankCheck;

        await (prisma as any).proposal.update({
          where: { id: proposal.id },
          data: { status: ProposalStatus.OFFER_ACCEPTED }
        });
        await createProposalActivity(proposal.unique_id, 'STATUS_CHANGE', { oldStatus: ProposalStatus.OFFER_SENT, newStatus: ProposalStatus.OFFER_ACCEPTED }, userId);
        const freelancerNameSign = await getUserFullName(userId);
        const projectTitleSign = proposal.project?.project_title || "Project";
        const offerAcceptedLinkSign = `${appConfig.frontendUrl}/proposals-and-offers/${proposal.unique_id}`;
        const notifData = { userId: proposal.project.user_id, type: 'OFFER_ACCEPTED' as const, notificationTitle: `${freelancerNameSign} accepted your offer`, notificationBody: `${freelancerNameSign} accepted your offer for "${projectTitleSign}".`, notificationLink: offerAcceptedLinkSign ?? null, actorId: userId, subjectType: 'Proposal' as const, subjectId: proposal.id };
        await dispatch(NotificationJob, notifData);
        await dispatch(NotificationEmailJob, notifData);
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
      Log.error("Update Proposal NDA Error", { error });
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
    proposalId: string,
    body: { reason?: string; reason_message?: string }
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

      if (proposal.status !== ProposalStatus.PENDING) {
        return {
          success: false,
          message: "Only pending proposals can be withdrawn"
        };
      }

      const reason = body.reason?.trim();
      const reasonMsg = body.reason_message?.trim() || null;

      const freelancerNameWP = await getUserFullName(userId);
      const remarkFields = buildRemarkFields(
        'freelancer', freelancerNameWP,
        'You withdrew your proposal',
        'withdrew their proposal',
        reason, reasonMsg,
      );
      await (prisma as any).proposal.update({
        where: { id: proposal.id },
        data: { status: ProposalStatus.WITHDRAWN, ...remarkFields }
      });

      await createProposalActivity(proposal.unique_id, 'STATUS_CHANGE', {
        oldStatus: ProposalStatus.PENDING,
        newStatus: ProposalStatus.WITHDRAWN,
        message: remarkFields.freelancer_remark ?? undefined,
        ...(remarkFields.freelancer_reason ? { main_reason: remarkFields.freelancer_reason } : {})
      }, userId);

      // Decrement proposals_count on the project — but only if this proposal
      // was actually counted. Drafts were never incremented in the first
      // place, so withdrawing them must not decrement below reality.
      if (!proposal.is_draft) {
        await prisma.founderProject.update({
          where: { id: proposal.project.id },
          data: { proposals_count: { decrement: 1 } }
        });
      }

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
            messageSent: remarkFields.freelancer_remark,
            messageReceived: remarkFields.founder_remark
          },
          proposal.project.id,
          userId
        );

        const proposalWithdrawnLink = `${appConfig.frontendUrl}/project/${project.unique_id}`;
        const notifData = { userId: project.user_id, type: 'PROPOSAL_WITHDRAWN' as const, notificationTitle: `${freelancerNameWP} withdrew their proposal`, notificationBody: `${freelancerNameWP} withdrew their proposal for "${projectTitle}".`, notificationLink: proposalWithdrawnLink ?? null, actorId: userId, subjectType: 'Proposal' as const, subjectId: proposal.id };
        await dispatch(NotificationJob, notifData);
        await dispatch(NotificationEmailJob, notifData);
      }

      return {
        success: true,
        message: "Proposal withdrawn successfully"
      };
    } catch (error: any) {
      Log.error("Withdraw Proposal Error", { error });
      return {
        success: false,
        message: error.message || "Failed to withdraw proposal"
      };
    }
  }

  /**
   * Terminate contract (founder or freelancer). Only when status is HIRED. Requires reason_key and/or reason_message; syncs to chat.
   */
  static async terminateContract(
    userId: number,
    proposalId: string,
    payload: { reason_key?: string; reason_message?: string }
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
      if (proposal.status !== ProposalStatus.HIRED) {
        return { success: false, message: "Only a hired contract can be terminated" };
      }
      if (proposal.status === ProposalStatus.TERMINATING || (proposal as any).terminate_at) {
        return { success: false, message: "Termination is already scheduled. Restore first if you want to cancel it." };
      }
      const isFounder = proposal.project.user_id === userId;
      const isProvider = proposal.provider_id === userId;
      if (!isFounder && !isProvider) {
        return { success: false, message: "You don't have permission to terminate this contract" };
      }
      const reason = payload.reason_key?.trim();
      const reasonMsg = payload.reason_message?.trim();
      if (!reason && !reasonMsg) {
        return { success: false, message: "Reason or reason message is required" };
      }

      const terminateAt = new Date();
      terminateAt.setDate(terminateAt.getDate() + 7);

      const actorRole: RemarkRole = isFounder ? 'founder' : 'freelancer';
      const actorName = await getUserFullName(userId);
      const remarkFields = buildRemarkFields(
        actorRole, actorName,
        'You scheduled termination',
        'scheduled contract termination',
        reason, reasonMsg,
      );
      await (prisma as any).proposal.update({
        where: { id: proposal.id },
        data: {
          status: ProposalStatus.TERMINATING,
          terminate_at: terminateAt,
          terminate_by: userId,
          ...remarkFields
        }
      });

      const actorRemark = isFounder ? remarkFields.founder_remark : remarkFields.freelancer_remark;
      const actorReason = isFounder ? remarkFields.founder_reason : remarkFields.freelancer_reason;
      await createProposalActivity(proposal.unique_id, 'STATUS_CHANGE', {
        oldStatus: ProposalStatus.HIRED,
        newStatus: ProposalStatus.TERMINATING,
        message: actorRemark ?? undefined,
        ...(actorReason ? { main_reason: actorReason } : {})
      }, userId);

      const projectTitle = proposal.project.project_title || "Project";
      await ConversationService.syncSystemMessage(
        proposal.project.user_id,
        proposal.provider_id,
        "",
        {
          activityType: "contract_terminate_scheduled",
          activityId: proposal.unique_id,
          projectTitle: proposal.project.project_title,
          terminateAt: terminateAt.toISOString(),
          messageSent: isFounder ? remarkFields.founder_remark : remarkFields.freelancer_remark,
          messageReceived: isFounder ? remarkFields.freelancer_remark : remarkFields.founder_remark
        },
        proposal.project.id,
        userId
      );

      return { success: true, message: "Contract will terminate in 7 days. You can restore it before then." };
    } catch (error: any) {
      Log.error("Terminate contract Error", { error });
      return { success: false, message: error.message || "Failed to terminate contract" };
    }
  }

  /**
   * Restore contract: only the user who scheduled termination (terminate_by) can restore.
   */
  static async restoreContract(userId: number, proposalId: string): Promise<ServiceResponse> {
    try {
      const proposal = await (prisma as any).proposal.findFirst({
        where: { unique_id: proposalId },
        include: { project: { select: { user_id: true, project_title: true, id: true } } }
      });
      if (!proposal) {
        return { success: false, message: "Proposal not found" };
      }
      if (proposal.status !== ProposalStatus.TERMINATING && proposal.status !== ProposalStatus.HIRED) {
        return { success: false, message: "Only a contract with scheduled termination can be restored" };
      }
      if (proposal.terminate_by != null && proposal.terminate_by !== userId) {
        return { success: false, message: "Only the person who scheduled the termination can restore the contract" };
      }
      const terminateAt = proposal.terminate_at ? new Date(proposal.terminate_at) : null;
      if (!terminateAt || terminateAt <= new Date()) {
        return { success: false, message: "No scheduled termination to restore or it has already passed" };
      }

      const restorerName = await getUserFullName(userId);
      const isFounder = proposal.project.user_id === userId;
      const restorerRole: RemarkRole = isFounder ? 'founder' : 'freelancer';
      const restoreFields = buildRemarkFields(
        restorerRole, restorerName,
        'You restored the contract',
        'restored the contract',
      );

      await (prisma as any).proposal.update({
        where: { id: proposal.id },
        data: {
          status: ProposalStatus.HIRED,
          terminate_at: null,
          terminate_by: null,
          ...restoreFields,
          founder_reason: null,
          freelancer_reason: null,
        }
      });

      const projectTitle = proposal.project?.project_title ?? "Project";
      await ConversationService.syncSystemMessage(
        proposal.project.user_id,
        proposal.provider_id,
        "",
        {
          activityType: "contract_restored",
          activityId: proposal.unique_id,
          projectTitle,
          messageSent: isFounder ? restoreFields.founder_remark : restoreFields.freelancer_remark,
          messageReceived: isFounder ? restoreFields.freelancer_remark : restoreFields.founder_remark
        },
        proposal.project.id,
        userId
      );

      return { success: true, message: "Contract restored successfully" };
    } catch (error: any) {
      Log.error("Restore contract Error", { error });
      return { success: false, message: error.message || "Failed to restore contract" };
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
      Log.error("Check Proposal Error", { error });
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

      const founderNameRM = await getUserFullName(userId);
      const founderRemark = `You requested a modification. ${trimmed}`;
      const freelancerRemark = `${founderNameRM} requested a modification. ${trimmed}`;
      await (prisma as any).proposal.update({
        where: { unique_id: proposalId },
        data: {
          founder_remark: founderRemark,
          freelancer_remark: freelancerRemark,
        }
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
          messageSent: founderRemark,
          messageReceived: freelancerRemark
        },
        proposal.project.id,
        proposal.project.user_id
      );

      const notificationLink = `${appConfig.frontendUrl}/proposals-and-offers/${proposal.unique_id}`;
      const notifData = {
        userId: proposal.provider_id,
        type: 'PROPOSAL_CHANGE_REQUESTED' as const,
        notificationTitle: `${founderNameRM} requested changes`,
        notificationBody: `${founderNameRM} requested changes to your proposal for "${projectTitle}". ${trimmed}`,
        notificationLink,
        actorId: userId,
        subjectType: 'Proposal' as const,
        subjectId: proposal.id
      };
      await dispatch(NotificationJob, notifData);
      await dispatch(NotificationEmailJob, notifData);

      return { success: true, message: "Request sent to the service provider" };
    } catch (error: any) {
      Log.error("Request Modify Error", { error });
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
      Log.error("Get Proposal Activities Error", { error });
      return { success: false, message: error.message || "Failed to get activities" };
    }
  }
}
