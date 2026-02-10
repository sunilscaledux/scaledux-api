import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";
import { getFileUrl } from '@utils/General';
import { ulid } from 'ulid';
import { createProposalActivity, getProposalActivities as fetchProposalActivities } from './ProposalActivityService';
import { ConversationService } from '@module/chat/ConversationService';

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

      // Create the proposal
      const proposal = await (prisma as any).proposal.create({
        data: {
          unique_id: ulid(),
          project_id: project.id,
          provider_id: userId,
          cover_letter: data.cover_letter || '',
          proposed_amount: data.proposed_amount,
          payment_schedule: data.payment_schedule,
          milestones: data.milestones,
          screening_answers: data.screening_answers,
          attachments: data.attachments,
          status: 'PENDING'
        }
      });

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

      // Sync to chat: conversation founder <-> provider, system message
      await ConversationService.syncSystemMessage(
        project.user_id,
        userId,
        "New proposal submitted",
        { activityType: "proposal_submitted", proposalId: proposal.unique_id, projectId: project.unique_id, projectTitle: project.project_title },
        project.id
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
              budget_amount: true,
              budget_currency: true,
              scope_of_work: true,
              status: true,
              created_at: true,
              user: {
                select: {
                  id: true,
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

      // Transform proposals with file URLs
      const transformedProposals = proposals.map((proposal: any) => ({
        ...proposal,
        attachments: proposal.attachments?.map((url: string) => getFileUrl(url)) || [],
        project: proposal.project ? {
          ...proposal.project,
          budget_currency: proposal.project.user?.currency?.symbol || '₹'
        } : null
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
      console.error("Get My Proposals Error:", error);
      return {
        success: false,
        message: error.message || "Failed to retrieve proposals"
      };
    }
  }

  /**
   * Get all proposals for a project (founder view)
   */
  static async getProposalsByProject(
    userId: number,
    projectId: string,
    status?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ServiceResponse> {
    try {
      // Find the project and verify ownership
      const project = await prisma.founderProject.findFirst({
        where: {
          unique_id: projectId,
          user_id: userId,
          deleted_at: null
        }
      });

      if (!project) {
        return {
          success: false,
          message: "Project not found or you don't have permission"
        };
      }

      const whereClause: any = {
        project_id: project.id
      };

      if (status) {
        whereClause.status = status;
      }

      const totalCount = await (prisma as any).proposal.count({ where: whereClause });

      const proposals = await (prisma as any).proposal.findMany({
        where: whereClause,
        include: {
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

      // Transform proposals with file URLs
      const transformedProposals = proposals.map((proposal: any) => ({
        ...proposal,
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
      console.error("Get Proposals By Project Error:", error);
      return {
        success: false,
        message: error.message || "Failed to retrieve proposals"
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
          project: {
            select: {
              id: true,
              unique_id: true,
              project_title: true,
              project_description: true,
              budget_amount: true,
              budget_currency: true,
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

      // Transform with file URLs
      const projectUser = proposal.project?.user;
      const transformedProposal = {
        ...proposal,
        attachments: proposal.attachments?.map((url: string) => getFileUrl(url)) || [],
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

      return {
        success: true,
        message: "Proposal retrieved successfully",
        data: transformedProposal
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
        where: { unique_id: proposalId, provider_id: userId }
      });
      if (!proposal) {
        return { success: false, message: "Proposal not found or you don't have permission" };
      }
      if (proposal.status !== 'PENDING') {
        return { success: false, message: "Only pending proposals can be edited" };
      }
      const oldSnapshot = {
        status: proposal.status,
        cover_letter: proposal.cover_letter,
        proposed_amount: proposal.proposed_amount?.toString?.(),
        payment_schedule: proposal.payment_schedule,
        milestones: proposal.milestones,
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
          milestones: data.milestones,
          screening_answers: data.screening_answers,
          attachments: data.attachments
        }
      });
      return { success: true, message: "Proposal updated successfully" };
    } catch (error: any) {
      console.error("Update Proposal Error:", error);
      return { success: false, message: error.message || "Failed to update proposal" };
    }
  }

  /**
   * Update proposal status (founder only)
   */
  static async updateProposalStatus(
    userId: number,
    proposalId: string,
    status: 'ACCEPTED' | 'REJECTED'
  ): Promise<ServiceResponse> {
    try {
      // Find the proposal
      const proposal = await (prisma as any).proposal.findFirst({
        where: {
          unique_id: proposalId
        },
        include: {
          project: {
            select: {
              id: true,
              user_id: true
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
        newStatus: status
      }, userId);

      // Update the proposal status
      await (prisma as any).proposal.update({
        where: { id: proposal.id },
        data: { status }
      });

      // Sync to chat: notify provider
      const content = status === 'ACCEPTED' ? "Proposal accepted" : "Proposal rejected";
      await ConversationService.syncSystemMessage(
        proposal.project.user_id,
        proposal.provider_id,
        content,
        { activityType: "proposal_status", proposalId: proposal.unique_id, newStatus: status },
        proposal.project.id
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

      // Decrement proposals_count on the project
      await prisma.founderProject.update({
        where: { id: proposal.project.id },
        data: { proposals_count: { decrement: 1 } }
      });

      // Sync to chat: notify founder (provider withdrew)
      const project = await prisma.founderProject.findFirst({ where: { id: proposal.project.id }, select: { user_id: true } });
      if (project) {
        await ConversationService.syncSystemMessage(
          project.user_id,
          userId,
          "Proposal withdrawn",
          { activityType: "proposal_withdrawn", proposalId: proposal.unique_id },
          proposal.project.id
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
        include: { project: { select: { user_id: true, id: true } } }
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

      // Sync to chat: notify provider
      await ConversationService.syncSystemMessage(
        proposal.project.user_id,
        proposal.provider_id,
        "Founder requested changes to your proposal",
        { activityType: "request_modify", proposalId: proposal.unique_id, message: trimmed },
        proposal.project.id
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
