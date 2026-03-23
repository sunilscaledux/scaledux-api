import { prisma } from "@services/prismaService";
import { CreateFounderProjectInput, UpdateFounderProjectInput } from "./FounderProjectType";
import { ServiceResponse } from "@utils/ApiResponse";
import { Log } from "@services/loggerService";
import { resolveAttachmentUrl, resolveAttachmentUrls, urlsOrPathsToAttachmentIds } from '@services/attachmentService';
import { ConversationService } from '@module/chat/ConversationService';
import { CHAT_SYSTEM_MESSAGES } from '../../constants/chatSystemMessages';
import { dispatch } from '@queues/Queue';
import { NotificationJob } from '../../jobs/NotificationJob';
import { NotificationEmailJob } from '../../jobs/NotificationEmailJob';
import { ProposalStatus, InviteStatus } from '@constants/status';

// Force server restart to pick up database changes

/**
 * FounderProjectService
 * Handles all founder project operations
 */
export class FounderProjectService {
  /**
   * Get all founder projects for a user
   */
  static async getUserProjects(
    userId: number, 
    status?: string,
    search?: string,
    categoryId?: number,
    sortBy: 'newest' | 'oldest' | 'budget' | 'updated' | 'proposals' | 'invited' = 'newest',
    contractStatus?: string[],
    milestoneStatus?: string[],
    contractStartFrom?: string,
    contractEndTo?: string
  ): Promise<ServiceResponse> {
    try {
      const whereClause: any = { 
        user_id: userId,
        deleted_at: null
      };
      
      if (status) {
        whereClause.status = status;
      }

      if (categoryId) {
        whereClause.expertise_category_id = categoryId;
      }

      // Search across title and description
      if (search) {
        whereClause.OR = [
          { project_title: { contains: search, mode: 'insensitive' } },
          { project_description: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Build optional filter on proposals (contract status and/or date range)
      const proposalStatusMap: Record<string, string[]> = {
        active: ['ACCEPTED'],
        completed: ['ACCEPTED'],
        cancelled: ['REJECTED', 'WITHDRAWN']
      };
      const presetToRange = (preset: string, now: Date) => {
        switch (preset) {
          case 'current-week': {
            const d = new Date(now);
            d.setDate(d.getDate() - d.getDay());
            d.setHours(0, 0, 0, 0);
            return { start: d, end: new Date(now) };
          }
          case 'last-week': {
            const d = new Date(now);
            d.setDate(d.getDate() - d.getDay() - 7);
            d.setHours(0, 0, 0, 0);
            const end = new Date(d);
            end.setDate(end.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            return { start: d, end };
          }
          case 'last-month': {
            const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
            return { start, end };
          }
          case 'last-90-days': {
            const start = new Date(now);
            start.setDate(start.getDate() - 90);
            start.setHours(0, 0, 0, 0);
            return { start, end: new Date(now) };
          }
          default:
            return null;
        }
      };

      const now = new Date();
      let proposalFilter: any = {};
      if (contractStatus && contractStatus.length > 0) {
        const statuses = contractStatus.flatMap((s) => proposalStatusMap[s] || []);
        if (statuses.length > 0) proposalFilter.status = { in: statuses };
      }
      if (contractStartFrom || contractEndTo) {
        let startDate: Date | null = null;
        let endDate: Date | null = null;
        if (contractStartFrom) {
          const range = presetToRange(contractStartFrom, now);
          if (range) startDate = range.start;
        }
        if (contractEndTo) {
          const range = presetToRange(contractEndTo, now);
          if (range) endDate = range.end;
        }
        if (startDate || endDate) {
          proposalFilter.created_at = {};
          if (startDate) proposalFilter.created_at.gte = startDate;
          if (endDate) proposalFilter.created_at.lte = endDate;
        }
      }
      if (Object.keys(proposalFilter).length > 0) {
        whereClause.proposals = { some: proposalFilter };
      }

      // milestoneStatus (e.g. payment-requested, active, awaiting-funding) would require filtering on proposal.milestones JSON; not applied here yet

      // Determine sort order
      let orderBy: any = { created_at: 'desc' };
      if (sortBy === 'oldest') {
        orderBy = { created_at: 'asc' };
      } else if (sortBy === 'budget') {
        orderBy = { budget_amount: 'desc' };
      } else if (sortBy === 'updated') {
        orderBy = { updated_at: 'desc' };
      } else if (sortBy === 'proposals') {
        orderBy = { proposals_count: 'desc' };
      } else if (sortBy === 'invited') {
        orderBy = { invited_count: 'desc' };
      }

      // Get user's currency for budget display
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          currency: {
            select: {
              id: true,
              code: true,
              symbol: true
            }
          }
        }
      });
      const currencySymbol = user?.currency?.symbol || '₹';

      const projects = await prisma.founderProject.findMany({
        where: whereClause,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          subcategory: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        },
        orderBy
      });

      // Transform file URLs to full URLs and add currency symbol
      const transformedProjects = await Promise.all(projects.map(async (project: any) => {
        const { category: cat, subcategory, ...rest } = project;
        return {
        ...rest,
        category_id: rest.expertise_category_id,
        sub_category_id: rest.specialty_id,
        category: cat,
        subCategory: subcategory,
        budget_currency: currencySymbol,
        project_files: project.project_files
          ? await resolveAttachmentUrls(project.project_files as string[], { entityType: 'founderProject', fieldName: 'project_files' })
          : []
      };
      }));

      return {
        success: true,
        data: transformedProjects,
        message: "Projects retrieved successfully"
      };
    } catch (error: any) {
      Log.error("Error in getUserProjects", { error });
      return {
        success: false,
        message: error.message || "Failed to retrieve projects"
      };
    }
  }

  /**
   * Browse published projects for service providers
   * Only returns published projects, with save/invite status for logged-in users
   */
  static async browseProjects(
    userId: number | null,
    params: {
      search?: string;
      categoryIds?: number[];
      skills?: string[];
      budgetMin?: number;
      budgetMax?: number;
      experienceLevel?: string;
      sortBy?: 'newest' | 'oldest' | 'budget_high' | 'budget_low';
      page?: number;
      limit?: number;
      filter?: 'all' | 'saved';
    }
  ): Promise<ServiceResponse> {
    try {
      const {
        search,
        categoryIds,
        skills,
        budgetMin,
        budgetMax,
        experienceLevel,
        sortBy = 'newest',
        page = 1,
        limit = 20,
        filter = 'all'
      } = params;

      // Base where clause - only published, not deleted
      const whereClause: any = {
        status: 'PUBLISHED',
        deleted_at: null
      };

      // Category filter (supports multiple categories)
      if (categoryIds && categoryIds.length > 0) {
        whereClause.expertise_category_id = { in: categoryIds };
      }

      // Search across title and description
      if (search) {
        whereClause.OR = [
          { project_title: { contains: search, mode: 'insensitive' } },
          { project_description: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Skills filter is applied in JavaScript after fetch (skills_required is Json, no hasSome for Json in Prisma)

      // Note: Budget filtering is done in JavaScript after fetch
      // because budget_amount is stored as string and string comparison
      // doesn't work correctly for numeric values (e.g., "7000" > "17000" in string comparison)

      // Experience level filter
      if (experienceLevel) {
        whereClause.experience_needed = experienceLevel;
      }

      // Filter by saved projects only
      if (filter === 'saved' && userId) {
        whereClause.savedByUsers = {
          some: { user_id: userId }
        };
      }

      // Determine sort order
      let orderBy: any = { created_at: 'desc' };
      if (sortBy === 'oldest') {
        orderBy = { created_at: 'asc' };
      } else if (sortBy === 'budget_high') {
        orderBy = { budget_amount: 'desc' };
      } else if (sortBy === 'budget_low') {
        orderBy = { budget_amount: 'asc' };
      }

      // Build include - add user status relations if logged in
      const baseInclude = {
        category: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        subcategory: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        user: {
          select: {
            id: true,
            unique_id: true,
            first_name: true,
            last_name: true,
            currency: {
              select: {
                id: true,
                code: true,
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
        }
      };

      const include = userId ? {
        ...baseInclude,
        invites: {
          where: { provider_id: userId, status: ProposalStatus.PENDING },
          select: { id: true, status: true }
        },
        savedByUsers: {
          where: { user_id: userId },
          select: { id: true }
        }
      } : baseInclude;

      // Check if budget filtering is needed
      const hasBudgetFilter = budgetMin !== undefined || budgetMax !== undefined;

      // Get all projects (we'll filter by budget and skills in JS - budget is string, skills_required is Json)
      let allProjects = await prisma.founderProject.findMany({
        where: whereClause,
        include: include as any,
        orderBy
      });

      // Apply skills filter in JavaScript (skills_required is Json; Prisma Json type doesn't support hasSome)
      if (skills && skills.length > 0) {
        allProjects = allProjects.filter((project: any) => {
          const projectSkills = Array.isArray(project.skills_required)
            ? project.skills_required
            : typeof project.skills_required === 'string'
              ? (() => { try { return JSON.parse(project.skills_required); } catch { return []; } })()
              : [];
          const skillStrings = projectSkills.map((s: any) => (typeof s === 'string' ? s : s?.name ?? s?.skill ?? '')).filter(Boolean);
          return skills.some((requested: string) =>
            skillStrings.some((ps: string) => String(ps).toLowerCase() === String(requested).toLowerCase())
          );
        });
      }

      // Apply budget filter in JavaScript (because budget_amount is stored as string)
      if (hasBudgetFilter) {
        allProjects = allProjects.filter((project: any) => {
          const budgetValue = parseFloat(project.budget_amount) || 0;
          if (budgetMin !== undefined && budgetValue < budgetMin) return false;
          if (budgetMax !== undefined && budgetValue > budgetMax) return false;
          return true;
        });
      }

      // Calculate pagination after budget filtering
      const totalCount = allProjects.length;
      const paginatedProjects = allProjects.slice((page - 1) * limit, page * limit);

      // Transform projects
      const transformedProjects = await Promise.all(paginatedProjects.map(async (project: any) => {
        const { invites, savedByUsers, subcategory, ...projectData } = project;
        // Use user's currency symbol if available, otherwise fallback to budget_currency or default
        const currencySymbol = project.user?.currency?.symbol || '₹';
        return {
          ...projectData,
          subCategory: subcategory,
          budget_currency: currencySymbol,
          project_files: project.project_files
            ? await resolveAttachmentUrls(project.project_files as string[], { entityType: 'founderProject', fieldName: 'project_files' })
            : [],
          is_saved: userId ? (savedByUsers?.length > 0) : false,
          is_invited: userId ? (invites?.length > 0) : false
        };
      }));

      return {
        success: true,
        data: {
          projects: transformedProjects,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        },
        message: "Projects retrieved successfully"
      };
    } catch (error: any) {
      Log.error("Error in browseProjects", { error });
      return {
        success: false,
        message: error.message || "Failed to retrieve projects"
      };
    }
  }

  /**
   * Get a single project by unique ID
   * - Project owners can see their drafts and published projects
   * - Non-owners (including service providers) can only see published projects
   */
  static async getProjectById(userId: number | null, uniqueId: string): Promise<ServiceResponse> {
    try {
      // Build include object - only add invites/savedByUsers when user is logged in
      const baseInclude = {
        category: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        subcategory: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            role: true,
            currency: {
              select: {
                id: true,
                code: true,
                symbol: true
              }
            },
            personalInfo: {
              select: {
                profileImage: true,
                city: true,
                country: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      };

      // Only include invites and savedByUsers for logged-in users (any invite status so we can show REJECTED)
      const include = userId ? {
        ...baseInclude,
        invites: {
          where: { provider_id: userId },
          select: { id: true, status: true, message: true, created_at: true }
        },
        savedByUsers: {
          where: { user_id: userId },
          select: { id: true }
        }
      } : baseInclude;

      // Fetch the project without ownership restriction first
      const project = await prisma.founderProject.findFirst({
        where: {
          unique_id: uniqueId,
          deleted_at: null
        },
        include: include as any
      });

      if (!project) {
        return {
          success: false,
          message: "Project not found"
        };
      }

      const isOwner = userId && project.user_id === userId;
      const isPublished = project.status === 'PUBLISHED';

      // Non-owners: allow if published OR if user is hired freelancer on this project
      if (!isOwner && !isPublished) {
        if (userId) {
          const hiredProposal = await (prisma as any).proposal.findFirst({
            where: {
              project_id: project.id,
              provider_id: userId,
              status: ProposalStatus.HIRED
            }
          });
          if (!hiredProposal) {
            return {
              success: false,
              message: "Project not found"
            };
          }
        } else {
          return {
            success: false,
            message: "Project not found"
          };
        }
      }

      // Check user status using relations (already filtered by userId in query)
      const isSavedByUser = !isOwner && (project as any).savedByUsers?.length > 0;
      const inviteData = (project as any).invites?.[0] || null;
      const inviteStatus = inviteData?.status || null;
      // is_invited = had a PENDING invite (for showing Accept/Reject). We also return invite_status so UI can show "Invitation rejected"
      const isInvitedUser = !isOwner && inviteStatus === ProposalStatus.PENDING;
      // Freelancer side: only show invitation message when PENDING (when REJECTED, message holds rejection reason — do not show to freelancer)
      const invitationMessageForViewer = !isOwner && inviteStatus === ProposalStatus.REJECTED ? null : (inviteData?.message || null);

      // Transform file URLs and remove relation data from response
      const { invites, savedByUsers, subcategory, ...projectData } = project as any;
      // Use user's currency symbol if available
      const currencySymbol = (project as any).user?.currency?.symbol || '₹';
      const transformedProject = {
        ...projectData,
        subCategory: subcategory,
        budget_currency: currencySymbol,
        project_files: project.project_files
          ? await resolveAttachmentUrls(project.project_files as string[], { entityType: 'founderProject', fieldName: 'project_files' })
          : [],
        is_saved: isSavedByUser,
        is_invited: isInvitedUser,
        invite_status: inviteStatus,
        invitation_message: invitationMessageForViewer,
        invitation_date: inviteData?.created_at || null,
        is_owner: isOwner
      };

      return {
        success: true,
        message: "Project retrieved successfully",
        data: transformedProject
      };
    } catch (error: any) {
      Log.error("Get Project By ID Error", { error });
      return {
        success: false,
        message: "Failed to get project"
      };
    }
  }

  /**
   * Create new founder project
   */
  static async createProject(userId: number, data: CreateFounderProjectInput): Promise<ServiceResponse> {
    try {
      const rawFileRefs = (data.projectFiles ?? []).map((f: { url?: string; unique_id?: string } | string) => (typeof f === 'string' ? f : (f?.url ?? (f as { unique_id?: string }).unique_id ?? '')));
      const projectFiles = urlsOrPathsToAttachmentIds(rawFileRefs);

      const project = await prisma.founderProject.create({
        data: {
          user_id: userId,
          project_title: data.projectTitle,
          project_description: data.projectDescription,
          expertise_category_id: data.categoryId,
          specialty_id: data.subCategoryId || null,
          project_files: projectFiles,
          scope_of_work: data.scopeOfWork,
          skills_required: data.skillsRequired,
          experience_needed: data.experienceNeeded,
          budget_currency: data.budget.currency,
          budget_amount: data.budget.amount,
          is_nda_required: data.isNdaRequired === 'yes',
          screening_questions: data.screeningQuestions || [],
          advanced_preferences: {
            english_level: data.advancedPreferences.englishLevel,
            hire_within: data.advancedPreferences.hireWithin,
            time_requirement: data.advancedPreferences.timeRequirement,
            earned_amount: data.advancedPreferences.earnedAmount,
            location: data.advancedPreferences.loccation,
            estimated_hours: data.advancedPreferences.estimatedHours ?? null
          },
          status: data.status || 'DRAFT'
        }
      });

      // Transform file URLs for response
      const transformedProject = {
        ...project,
        project_files: await resolveAttachmentUrls((project.project_files as string[]) || [], { entityType: 'founderProject', fieldName: 'project_files' })
      };

      return {
        success: true,
        message: "Project created successfully",
        data: transformedProject
      };
    } catch (error: any) {
      Log.error("Create Project Error", { error });
      return {
        success: false,
        message: "Failed to create project"
      };
    }
  }


  /**
   * Update founder project
   */
  static async updateProject(userId: number, uniqueId: string, data: UpdateFounderProjectInput): Promise<ServiceResponse> {
    try {
      // Check if project exists and belongs to user
      const existingProject = await prisma.founderProject.findFirst({
        where: { 
          unique_id: uniqueId,
          user_id: userId,
          deleted_at: null
        }
      });

      if (!existingProject) {
        return {
          success: false,
          message: "Project not found"
        };
      }

      // Prepare update data
      const updateData: any = {};

      if (data.projectTitle !== undefined) updateData.project_title = data.projectTitle;
      if (data.projectDescription !== undefined) updateData.project_description = data.projectDescription;
      if (data.categoryId !== undefined) updateData.expertise_category_id = data.categoryId;
      if (data.subCategoryId !== undefined) updateData.specialty_id = data.subCategoryId;
      if (data.scopeOfWork !== undefined) updateData.scope_of_work = data.scopeOfWork;
      if (data.skillsRequired !== undefined) updateData.skills_required = data.skillsRequired;
      if (data.experienceNeeded !== undefined) updateData.experience_needed = data.experienceNeeded;
      if (data.isNdaRequired !== undefined) updateData.is_nda_required = data.isNdaRequired === 'yes';
      if (data.status !== undefined) updateData.status = data.status;

      if (data.projectFiles !== undefined) {
        const rawFileRefs = data.projectFiles.map((f: { url?: string; unique_id?: string } | string) => (typeof f === 'string' ? f : (f?.url ?? (f as { unique_id?: string }).unique_id ?? '')));
        updateData.project_files = urlsOrPathsToAttachmentIds(rawFileRefs);
      }

      if (data.budget !== undefined) {
        updateData.budget_currency = data.budget.currency;
        updateData.budget_amount = data.budget.amount;
      }

      if (data.screeningQuestions !== undefined) {
        updateData.screening_questions = data.screeningQuestions;
      }

      if (data.advancedPreferences !== undefined) {
        const currentPrefs = existingProject.advanced_preferences as any;
        updateData.advanced_preferences = {
          english_level: data.advancedPreferences.englishLevel ?? currentPrefs.english_level,
          hire_within: data.advancedPreferences.hireWithin ?? currentPrefs.hire_within,
          time_requirement: data.advancedPreferences.timeRequirement ?? currentPrefs.time_requirement,
          earned_amount: data.advancedPreferences.earnedAmount ?? currentPrefs.earned_amount,
          location: data.advancedPreferences.loccation ?? currentPrefs.location,
          estimated_hours: data.advancedPreferences.estimatedHours ?? currentPrefs.estimated_hours ?? null
        };
      }

      const updatedProject = await prisma.founderProject.update({
        where: { id: existingProject.id },
        data: updateData
      });

      // Transform file URLs
      const transformedProject = {
        ...updatedProject,
        project_files: await resolveAttachmentUrls((updatedProject.project_files as string[]) || [], { entityType: 'founderProject', fieldName: 'project_files' })
      };

      return {
        success: true,
        message: "Project updated successfully",
        data: transformedProject
      };
    } catch (error: any) {
      Log.error("Update Project Error", { error });
      return {
        success: false,
        message: "Failed to update project"
      };
    }
  }

  /**
   * Delete project (soft delete)
   */
  static async deleteProject(userId: number, uniqueId: string): Promise<ServiceResponse> {
    try {
      const project = await prisma.founderProject.findFirst({
        where: { 
          unique_id: uniqueId,
          user_id: userId,
          deleted_at: null
        }
      });

      if (!project) {
        return {
          success: false,
          message: "Project not found"
        };
      }

      await prisma.founderProject.update({
        where: { id: project.id },
        data: { deleted_at: new Date() }
      });

      return {
        success: true,
        message: "Project deleted successfully",
        data: null
      };
    } catch (error: any) {
      Log.error("Delete Project Error", { error });
      return {
        success: false,
        message: "Failed to delete project"
      };
    }
  }

  /**
   * Duplicate project
   */
  static async duplicateProject(userId: number, uniqueId: string): Promise<ServiceResponse> {
    try {
      const originalProject = await prisma.founderProject.findFirst({
        where: { 
          unique_id: uniqueId,
          user_id: userId,
          deleted_at: null
        }
      });

      if (!originalProject) {
        return {
          success: false,
          message: "Project not found"
        };
      }

      const duplicatedProject = await prisma.founderProject.create({
        data: {
          user_id: userId,
          project_title: `${originalProject.project_title} (Copy)`,
          project_description: originalProject.project_description,
          expertise_category_id: originalProject.expertise_category_id,
          specialty_id: originalProject.specialty_id,
          project_files: originalProject.project_files as any,
          scope_of_work: originalProject.scope_of_work,
          skills_required: originalProject.skills_required as any,
          experience_needed: originalProject.experience_needed,
          budget_currency: originalProject.budget_currency,
          budget_amount: originalProject.budget_amount,
          is_nda_required: originalProject.is_nda_required,
          screening_questions: originalProject.screening_questions as any,
          advanced_preferences: originalProject.advanced_preferences as any,
          status: 'DRAFT' // Always create duplicates as drafts
        }
      });

      // Transform file URLs
      const transformedProject = {
        ...duplicatedProject,
        project_files: await resolveAttachmentUrls((duplicatedProject.project_files as string[]) || [], { entityType: 'founderProject', fieldName: 'project_files' })
      };

      return {
        success: true,
        message: "Project duplicated successfully",
        data: transformedProject
      };
    } catch (error: any) {
      Log.error("Duplicate Project Error", { error });
      return {
        success: false,
        message: "Failed to duplicate project"
      };
    }
  }

  /**
   * Get service providers (freelancers) - with filter support
   */
  static async getMatchingServiceProviders(
    userId: number,
    projectId: string,
    page: number = 1,
    limit: number = 10,
    sortBy: 'relevance' | 'rating' | 'hourly_rate' | 'projects_completed' = 'relevance',
    filter: 'all' | 'invited' | 'saved' = 'all'
  ): Promise<ServiceResponse> {
    try {
      // First check if project exists
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

      // Check if user is the project owner
      if (project.user_id !== userId) {
        return {
          success: false,
          message: "You don't have permission to view service providers for this project"
        };
      }

      const projectSkills = (project.skills_required as string[]) || [];
      const savedProviderIds = ((project as any).saved_providers as number[]) || [];

      // Get invited provider IDs and their invite data (only PENDING invites count as "invited")
      const invites = await (prisma as any).projectInvite.findMany({
        where: { project_id: project.id },
        select: {
          provider_id: true,
          created_at: true,
          message: true,
          status: true
        }
      });
      // Map all invites by provider ID for easy lookup
      const inviteMap = new Map(invites.map((i: any) => [i.provider_id, i]));
      // All provider IDs that have any invite (for the 'invited' filter)
      const allInvitedProviderIds = invites.map((i: any) => i.provider_id);
      // Only PENDING invites are considered "invited" for the is_invited flag
      const pendingInvites = invites.filter((i: any) => i.status === ProposalStatus.PENDING);
      const pendingInvitedProviderIds = pendingInvites.map((i: any) => i.provider_id);

      // Build where clause based on filter
      let whereClause: any = {
        role: 'freelancer',
        id: { not: userId },
        status: 1
      };

      if (filter === 'invited') {
        // Show all providers with any invite status (PENDING, ACCEPTED, REJECTED)
        if (allInvitedProviderIds.length === 0) {
          return {
            success: true,
            message: "Service providers retrieved successfully",
            data: {
              providers: [],
              pagination: { page, limit, total: 0, totalPages: 0 },
              project_skills: projectSkills
            }
          };
        }
        whereClause.id = { in: allInvitedProviderIds };
      } else if (filter === 'saved') {
        if (savedProviderIds.length === 0) {
          return {
            success: true,
            message: "Service providers retrieved successfully",
            data: {
              providers: [],
              pagination: { page, limit, total: 0, totalPages: 0 },
              project_skills: projectSkills
            }
          };
        }
        whereClause.id = { in: savedProviderIds };
      }

      // Fetch freelancers
      const freelancers = await prisma.user.findMany({
        where: whereClause,
        include: {
          personalInfo: {
            include: {
              country: { select: { id: true, name: true, code: true } },
              state: { select: { id: true, name: true } }
            }
          },
          expertises: {
            include: {
              category: { select: { id: true, name: true } }
            }
          },
          servicePackages: {
            where: { status: 'PUBLISHED' },
            select: { id: true }
          }
        }
      });

      // Transform freelancers to provider format
      const providers = await Promise.all(freelancers.map(async freelancer => {
        const userSkills: string[] = [];
        freelancer.expertises.forEach((exp: any) => {
          if (exp.skills && Array.isArray(exp.skills)) {
            userSkills.push(...(exp.skills as string[]));
          }
        });

        const invite = inviteMap.get(freelancer.id);
        // is_invited is true only for PENDING invitations
        const isInvited = pendingInvitedProviderIds.includes(freelancer.id);
        const isSaved = savedProviderIds.includes(freelancer.id);

        return {
          id: freelancer.id,
          unique_id: freelancer.unique_id,
          first_name: freelancer.first_name,
          last_name: freelancer.last_name,
          email: freelancer.email,
          profile_image: freelancer.personalInfo?.profileImage
            ? await resolveAttachmentUrl(freelancer.personalInfo.profileImage, { entityType: 'personalInfo', fieldName: 'profile_image' }) 
            : null,
          title: freelancer.personalInfo?.title || null,
          about: freelancer.personalInfo?.about || null,
          hourly_rate: freelancer.personalInfo?.hourly_rate || null,
          country: freelancer.personalInfo?.country || null,
          state: freelancer.personalInfo?.state || null,
          city: freelancer.personalInfo?.city || null,
          expertises: freelancer.expertises.map((exp: any) => ({
            id: exp.id,
            category: exp.category,
            specialty_ids: exp.specialty_ids || [],
            skills: exp.skills || []
          })),
          all_skills: userSkills,
          matched_skills: [],
          match_score: 0,
          service_packages_count: freelancer.servicePackages.length,
          total_earned: 0,
          projects_completed: freelancer.servicePackages.length,
          rating: 0,
          reviews_count: 0,
          is_invited: isInvited,
          invite_status: (invite as any)?.status || null,
          invited_at: (invite as any)?.created_at || null,
          is_saved: isSaved,
          invite_rejection_reason: (invite as any)?.status === ProposalStatus.REJECTED ? (invite as any)?.message || null : null
        };
      }));

      // Pagination
      const total = providers.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const paginatedProviders = providers.slice(offset, offset + limit);

      return {
        success: true,
        message: "Service providers retrieved successfully",
        data: {
          providers: paginatedProviders,
          pagination: { page, limit, total, totalPages },
          project_skills: projectSkills
        }
      };
    } catch (error: any) {
      Log.error("Get Service Providers Error", { error });
      return {
        success: false,
        message: "Failed to get service providers"
      };
    }
  }

  /*
   * TODO: Re-enable matching logic later
   * 
   * Helper to sort providers by different criteria
   *
  private static sortProviders(
    providers: any[],
    sortBy: 'relevance' | 'rating' | 'hourly_rate' | 'projects_completed'
  ): any[] {
    switch (sortBy) {
      case 'relevance':
        return providers.sort((a, b) => b.match_score - a.match_score);
      case 'rating':
        return providers.sort((a, b) => b.rating - a.rating);
      case 'hourly_rate':
        return providers.sort((a, b) => (a.hourly_rate || 0) - (b.hourly_rate || 0));
      case 'projects_completed':
        return providers.sort((a, b) => b.projects_completed - a.projects_completed);
      default:
        return providers.sort((a, b) => b.match_score - a.match_score);
    }
  }
  */

  /**
   * Invite a service provider to a project
   */
  static async inviteProvider(
    userId: number,
    projectId: string,
    providerId: number,
    message?: string
  ): Promise<ServiceResponse> {
    try {
      // Get the project
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
          message: "Project not found"
        };
      }

      // Verify the provider exists and is a freelancer
      const provider = await prisma.user.findFirst({
        where: {
          id: providerId,
          role: 'freelancer',
          status: 1
        },
        select: { id: true, first_name: true }
      });

      if (!provider) {
        return {
          success: false,
          message: "Provider not found"
        };
      }

      // Check if already invited
      const existingInvite = await (prisma as any).projectInvite.findUnique({
        where: {
          project_id_provider_id: {
            project_id: project.id,
            provider_id: providerId
          }
        } 
      });

      if (existingInvite) {
        return {
          success: false,
          message: "Provider already invited"
        };
      }

      // Do not allow re-inviting a provider who had an offer withdrawn for this project
      const withdrawnProposal = await (prisma as any).proposal.findFirst({
        where: {
          project_id: project.id,
          provider_id: providerId,
          status: ProposalStatus.WITHDRAWN
        }
      });

      if (withdrawnProposal) {
        return {
          success: false,
          message: "You cannot invite this provider again for this project; they had an offer withdrawn."
        };
      }

      // Create the invite record
      await (prisma as any).projectInvite.create({
        data: {
          project_id: project.id,
          provider_id: providerId,
          message: message || null
        }
      });

      // Update project invited count
      await prisma.founderProject.update({
        where: { id: project.id },
        data: { invited_count: { increment: 1 } }
      });

      // Sync to chat: get-or-create conversation and add system message (initiator = founder)
      const projectTitle = project.project_title || "Project";
      await ConversationService.syncSystemMessage(
        project.user_id,
        providerId,
        "",
        {
          activityType: "project_invitation",
          activityId: project.unique_id,
          projectTitle: project.project_title,
          messageSent: `${CHAT_SYSTEM_MESSAGES.PROJECT_INVITATION_SENT}: ${projectTitle}`,
          messageReceived: `${CHAT_SYSTEM_MESSAGES.PROJECT_INVITATION_RECEIVED}: ${projectTitle}`
        },
        project.id,
        project.user_id
      );

      const notificationTitle = `You're invited to work on "${projectTitle}"`;
      const notificationBody = `A project owner invited you to submit a proposal for "${projectTitle}".`;
      const notificationLink = `${process.env.FRONTEND_URL || process.env.APP_URL || ''}/project/${project.unique_id}`;

      const notifData = { userId: providerId, type: 'PROJECT_INVITATION' as const, notificationTitle, notificationBody, notificationLink: notificationLink ?? null, actorId: userId, subjectType: 'FounderProject' as const, subjectId: project.id };
      await dispatch(NotificationJob, notifData);
      await dispatch(NotificationEmailJob, notifData);

      return {
        success: true,
        message: "Invitation sent successfully",
        data: null
      };
    } catch (error: any) {
      Log.error("Invite Provider Error", { error });
      return {
        success: false,
        message: "Failed to invite provider"
      };
    }
  }

  /**
   * Reject an invitation (service provider rejects founder's invitation).
   * Optional reason is stored in invite message (founder sees it; freelancer does not).
   */
  static async rejectInvitation(
    userId: number,
    projectId: string,
    reason?: string
  ): Promise<ServiceResponse> {
    try {
      // Get the project
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

      // Check if user was invited to this project with PENDING status
      const invite = await (prisma as any).projectInvite.findFirst({
        where: {
          project_id: project.id,
          provider_id: userId,
          status: ProposalStatus.PENDING
        }
      });

      if (!invite) {
        return {
          success: false,
          message: "You don't have a pending invitation for this project"
        };
      }

      // Update the invite status to REJECTED and store rejection reason in message (for founder to see)
      await (prisma as any).projectInvite.update({
        where: {
          project_id_provider_id: {
            project_id: project.id,
            provider_id: userId
          }
        },
        data: {
          status: ProposalStatus.REJECTED,
          message: (reason && reason.trim()) ? reason.trim() : null
        }
      });

      const projectTitle = project.project_title || "Project";
      await ConversationService.syncSystemMessage(
        project.user_id,
        userId,
        "",
        {
          activityType: "project_invitation_rejected",
          activityId: project.unique_id,
          projectTitle,
          messageSent: `${CHAT_SYSTEM_MESSAGES.PROJECT_INVITATION_REJECTED_SENT}: ${projectTitle}`,
          messageReceived: `${CHAT_SYSTEM_MESSAGES.PROJECT_INVITATION_REJECTED_RECEIVED}: ${projectTitle}`
        },
        project.id,
        userId
      );

      const notificationLink = `${process.env.FRONTEND_URL || process.env.APP_URL || ''}/project/${project.unique_id}`;
      const notifData = { userId: project.user_id, type: 'INVITATION_REJECTED' as const, notificationTitle: 'Invitation declined', notificationBody: `A freelancer declined your invitation for "${projectTitle}".`, notificationLink: notificationLink ?? null, actorId: userId, subjectType: 'FounderProject' as const, subjectId: project.id };
      await dispatch(NotificationJob, notifData);
      await dispatch(NotificationEmailJob, notifData);

      return {
        success: true,
        message: "Invitation rejected successfully"
      };
    } catch (error: any) {
      Log.error("Reject Invitation Error", { error });
      return {
        success: false,
        message: "Failed to reject invitation"
      };
    }
  }

  /**
   * Accept an invitation (service provider accepts founder's invitation)
   */
  static async acceptInvitation(
    userId: number,
    projectId: string
  ): Promise<ServiceResponse> {
    try {
      const project = await prisma.founderProject.findFirst({
        where: { unique_id: projectId, deleted_at: null }
      });
      if (!project) {
        return { success: false, message: "Project not found" };
      }
      const invite = await (prisma as any).projectInvite.findFirst({
        where: {
          project_id: project.id,
          provider_id: userId,
          status: ProposalStatus.PENDING
        }
      });
      if (!invite) {
        return { success: false, message: "You don't have a pending invitation for this project" };
      }
      await (prisma as any).projectInvite.update({
        where: { project_id_provider_id: { project_id: project.id, provider_id: userId } },
        data: { status: InviteStatus.ACCEPTED }
      });

      const projectTitle = project.project_title || "Project";
      await ConversationService.syncSystemMessage(
        project.user_id,
        userId,
        "",
        {
          activityType: "project_invitation_accepted",
          activityId: project.unique_id,
          projectTitle,
          messageSent: `${CHAT_SYSTEM_MESSAGES.PROJECT_INVITATION_ACCEPTED_SENT}: ${projectTitle}`,
          messageReceived: `${CHAT_SYSTEM_MESSAGES.PROJECT_INVITATION_ACCEPTED_RECEIVED}: ${projectTitle}`
        },
        project.id,
        userId
      );
      await ConversationService.setConversationStatusAcceptedByProject(project.id, userId);

      const notificationLink = `${process.env.FRONTEND_URL || process.env.APP_URL || ''}/project/${project.unique_id}`;
      const notifData = { userId: project.user_id, type: 'INVITATION_ACCEPTED' as const, notificationTitle: 'Invitation accepted', notificationBody: `A freelancer accepted your invitation for "${projectTitle}".`, notificationLink: notificationLink ?? null, actorId: userId, subjectType: 'FounderProject' as const, subjectId: project.id };
      await dispatch(NotificationJob, notifData);
      await dispatch(NotificationEmailJob, notifData);

      return { success: true, message: "Invitation accepted successfully" };
    } catch (error: any) {
      Log.error("Accept Invitation Error", { error });
      return { success: false, message: error?.message || "Failed to accept invitation" };
    }
  }

  /**
   * Save/unsave a provider for later
   */
  static async toggleSaveProvider(
    userId: number,
    projectId: string,
    providerId: number
  ): Promise<ServiceResponse> {
    try {
      // Get the project
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
          message: "Project not found"
        };
      }

      // Verify the provider exists and is a freelancer
      const provider = await prisma.user.findFirst({
        where: {
          id: providerId,
          role: 'freelancer',
          status: 1
        }
      });

      if (!provider) {
        return {
          success: false,
          message: "Provider not found"
        };
      }

      // Get current saved providers array
      const savedProviders = ((project as any).saved_providers as number[]) || [];
      const isSaved = savedProviders.includes(providerId);

      let newSavedProviders: number[];
      if (isSaved) {
        // Remove from saved
        newSavedProviders = savedProviders.filter(id => id !== providerId);
      } else {
        // Add to saved
        newSavedProviders = [...savedProviders, providerId];
      }

      // Update the project with saved providers as JSON
      await (prisma.founderProject.update as any)({
        where: { id: project.id },
        data: { saved_providers: newSavedProviders }
      });

      return {
        success: true,
        message: isSaved ? "Provider unsaved" : "Provider saved",
        data: { is_saved: !isSaved }
      };
    } catch (error: any) {
      Log.error("Toggle Save Provider Error", { error });
      return {
        success: false,
        message: "Failed to save provider"
      };
    }
  }

  /**
   * Toggle save project for service providers (save for later)
   */
  static async toggleSaveProject(
    userId: number,
    projectId: string
  ): Promise<ServiceResponse> {
    try {
      // Get the project
      const project = await prisma.founderProject.findFirst({
        where: {
          unique_id: projectId,
          deleted_at: null,
          status: 'PUBLISHED' // Only allow saving published projects
        }
      });

      if (!project) {
        return {
          success: false,
          message: "Project not found"
        };
      }

      // Check if user is the project owner (owners shouldn't save their own projects)
      if (project.user_id === userId) {
        return {
          success: false,
          message: "You cannot save your own project"
        };
      }

      // Check if already saved
      const existingSave = await (prisma as any).savedProject.findUnique({
        where: {
          project_id_user_id: {
            project_id: project.id,
            user_id: userId
          }
        }
      });

      if (existingSave) {
        // Unsave the project
        await (prisma as any).savedProject.delete({
          where: {
            project_id_user_id: {
              project_id: project.id,
              user_id: userId
            }
          }
        });

        return {
          success: true,
          message: "Project unsaved",
          data: { is_saved: false }
        };
      }

      // Save the project
      await (prisma as any).savedProject.create({
        data: {
          project_id: project.id,
          user_id: userId
        }
      });

      return {
        success: true,
        message: "Project saved",
        data: { is_saved: true }
      };
    } catch (error: any) {
      Log.error("Toggle Save Project Error", { error });
      return {
        success: false,
        message: "Failed to save project"
      };
    }
  }

  /**
   * Check if a project is saved by the user
   */
  static async isProjectSaved(
    userId: number,
    projectId: string
  ): Promise<boolean> {
    try {
      const project = await prisma.founderProject.findFirst({
        where: { unique_id: projectId, deleted_at: null }
      });

      if (!project) return false;

      const existingSave = await (prisma as any).savedProject.findUnique({
        where: {
          project_id_user_id: {
            project_id: project.id,
            user_id: userId
          }
        }
      });

      return !!existingSave;
    } catch (error) {
      return false;
    }
  }

}
