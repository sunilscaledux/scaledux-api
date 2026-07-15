import { prisma } from "@services/prismaService";
import { CreateFounderProjectInput, UpdateFounderProjectInput } from "./FounderProjectType";
import { ServiceResponse } from "@utils/ApiResponse";
import { Log } from "@services/loggerService";
import { resolveAttachmentUrl, resolveAttachmentUrls, urlsOrPathsToAttachmentIds, markAttachmentsAttached } from '@services/attachmentService';
import { ConversationService } from '@module/chat/ConversationService';
import { CHAT_SYSTEM_MESSAGES } from '../../constants/chatSystemMessages';
import { dispatch } from '@queues/Queue';
import { NotificationJob } from '../../jobs/NotificationJob';
import { NotificationEmailJob } from '../../jobs/NotificationEmailJob';
import { ProposalStatus, ProjectStatus, InviteStatus } from '@constants/status';
import { getUserFullName, getDisplayName, maskUserName } from '@utils/General';
import { MatchingService, buildFreelancerProfile } from '@services/matchingService';
import { areMandatorySectionsComplete, type ProfileCompletionSectionsMap } from '@constants/profileCompletion';
import { PROFILE_COMPLETION_THRESHOLD } from '@middleware/requireCompleteProfile';

import { appConfig } from '@config/app';
const FRONTEND_URL = appConfig.frontendUrl;

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
          ? await resolveAttachmentUrls(project.project_files as string[], 'founder_project_files')
          : [],
        scaledux_url: `${FRONTEND_URL}/project/${project.unique_id}`
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
      sortBy?: 'newest' | 'oldest' | 'budget_high' | 'budget_low' | 'relevance';
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

      // Base where clause - only published, not deleted, and only from
      // founders whose profile meets the required completion bar (so service
      // providers don't see projects from founders they can't realistically
      // work with).
      //
      // status PUBLISHED is what keeps awarded work out of browse: an accepted
      // offer moves the project to IN_PROGRESS and completion to COMPLETED.
      // (This used to also filter hired_count: 0, but nothing ever incremented
      // that column, so it matched every row and hid nothing.)
      const whereClause: any = {
        status: ProjectStatus.PUBLISHED,
        deleted_at: null,
        user: {
          profile_completion_percentage: { gte: PROFILE_COMPLETION_THRESHOLD }
        }
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

      // Skills filter at DB level (Prisma JSON array_contains on PostgreSQL)
      if (skills && skills.length > 0) {
        const andConditions = whereClause.AND || [];
        andConditions.push({
          OR: skills.map((s: string) => ({
            skills_required: { array_contains: [s] }
          }))
        });
        whereClause.AND = andConditions;
      }

      // Budget filter at DB level using raw SQL (budget_amount is stored as VARCHAR)
      const hasBudgetFilter = budgetMin !== undefined || budgetMax !== undefined;
      if (hasBudgetFilter) {
        const andConditions = whereClause.AND || [];
        if (budgetMin !== undefined) {
          andConditions.push({
            budget_amount: { not: null }
          });
        }
        whereClause.AND = andConditions;
      }

      // Budget needs JS filtering since it's stored as string (can't CAST in Prisma)
      const matchesBudget = (project: any): boolean => {
        if (!hasBudgetFilter) return true;
        const budgetValue = parseFloat(project.budget_amount) || 0;
        if (budgetMin !== undefined && budgetValue < budgetMin) return false;
        if (budgetMax !== undefined && budgetValue > budgetMax) return false;
        return true;
      };

      let paginatedProjects: any[];
      let totalCount: number;

      // Check if user applied any explicit filters
      const hasExplicitFilters = !!(search || (categoryIds && categoryIds.length > 0) || (skills && skills.length > 0) || budgetMin !== undefined || budgetMax !== undefined || experienceLevel || filter === 'saved');

      if (!hasExplicitFilters && userId) {
        // ── No filters: try to show jobs matching user's skills/industry first ──
        const userData = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            expertises: true,
            personalInfo: { select: { country_id: true } }
          }
        });

        if (userData?.expertises?.length) {
          const userSkills: string[] = [];
          const userCategoryIds: number[] = [];
          userData.expertises.forEach((exp: any) => {
            if (exp.categoryId || exp.expertise_category_id) {
              userCategoryIds.push(exp.categoryId || exp.expertise_category_id);
            }
            if (Array.isArray(exp.skills)) userSkills.push(...(exp.skills as string[]));
          });

          if (userSkills.length > 0 || userCategoryIds.length > 0) {
            // Build a where clause matching user's skills or categories
            const personalizedWhere: any = { ...whereClause };
            const orConditions: any[] = [];
            if (userCategoryIds.length > 0) {
              orConditions.push({ expertise_category_id: { in: userCategoryIds } });
            }
            for (const skill of userSkills.slice(0, 20)) { // limit to avoid huge query
              orConditions.push({ skills_required: { array_contains: [skill] } });
            }
            if (orConditions.length > 0) {
              personalizedWhere.OR = orConditions;
            }

            const matchedCount = await prisma.founderProject.count({ where: personalizedWhere });

            if (matchedCount > 0) {
              // Found matching projects — use personalized query
              const [projects] = await Promise.all([
                prisma.founderProject.findMany({
                  where: personalizedWhere,
                  include: include as any,
                  orderBy,
                  skip: (page - 1) * limit,
                  take: limit
                })
              ]);
              totalCount = matchedCount;
              paginatedProjects = projects;
            } else {
              // No matching projects — fall through to show all
              const [count, projects] = await Promise.all([
                prisma.founderProject.count({ where: whereClause }),
                prisma.founderProject.findMany({ where: whereClause, include: include as any, orderBy, skip: (page - 1) * limit, take: limit })
              ]);
              totalCount = count;
              paginatedProjects = projects;
            }
          } else {
            // User has no skills — show all
            const [count, projects] = await Promise.all([
              prisma.founderProject.count({ where: whereClause }),
              prisma.founderProject.findMany({ where: whereClause, include: include as any, orderBy, skip: (page - 1) * limit, take: limit })
            ]);
            totalCount = count;
            paginatedProjects = projects;
          }
        } else {
          // No expertises — show all
          const [count, projects] = await Promise.all([
            prisma.founderProject.count({ where: whereClause }),
            prisma.founderProject.findMany({ where: whereClause, include: include as any, orderBy, skip: (page - 1) * limit, take: limit })
          ]);
          totalCount = count;
          paginatedProjects = projects;
        }
      } else if (sortBy === 'relevance' && userId) {
        // ── Relevance path: score + paginate in SQL, then hydrate only the page ──
        const freelancerData = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            expertises: true,
            personalInfo: { include: { country: { select: { name: true } } } }
          }
        });

        if (freelancerData) {
          const profile = buildFreelancerProfile(freelancerData);

          // Build raw WHERE clause matching Prisma's whereClause. Keep these two
          // in step — the profile-completion bar lives here as an EXISTS because
          // this path has no join to the founder, and omitting it used to make
          // sortBy=relevance surface projects the other sorts correctly hid.
          const conditions: string[] = [
            `status = '${ProjectStatus.PUBLISHED}'`,
            `deleted_at IS NULL`,
            `EXISTS (SELECT 1 FROM scd_users u WHERE u.id = scd_founder_projects.user_id AND u.profile_completion_percentage >= ${Number(PROFILE_COMPLETION_THRESHOLD)})`,
          ];
          const params: any[] = [];
          let paramIdx = 1;

          if (categoryIds && categoryIds.length > 0) {
            conditions.push(`expertise_category_id = ANY($${paramIdx}::int[])`);
            params.push(categoryIds);
            paramIdx++;
          }
          if (search) {
            conditions.push(`(project_title ILIKE $${paramIdx} OR project_description ILIKE $${paramIdx})`);
            params.push(`%${search}%`);
            paramIdx++;
          }
          if (experienceLevel) {
            conditions.push(`experience_needed = $${paramIdx}`);
            params.push(experienceLevel);
            paramIdx++;
          }
          if (skills && skills.length > 0) {
            const skillConditions = skills.map(s => {
              const escaped = s.replace(/'/g, "''");
              return `EXISTS (SELECT 1 FROM jsonb_array_elements_text(skills_required) AS elem WHERE LOWER(elem) = '${escaped.toLowerCase()}')`;
            });
            conditions.push(`(${skillConditions.join(' OR ')})`);
          }
          if (hasBudgetFilter) {
            if (budgetMin !== undefined) {
              conditions.push(`budget_amount IS NOT NULL AND CAST(budget_amount AS DECIMAL) >= $${paramIdx}`);
              params.push(budgetMin);
              paramIdx++;
            }
            if (budgetMax !== undefined) {
              conditions.push(`budget_amount IS NOT NULL AND CAST(budget_amount AS DECIMAL) <= $${paramIdx}`);
              params.push(budgetMax);
              paramIdx++;
            }
          }
          if (filter === 'saved' && userId) {
            conditions.push(`EXISTS (SELECT 1 FROM scd_saved_projects sp WHERE sp.project_id = scd_founder_projects.id AND sp.user_id = $${paramIdx})`);
            params.push(userId);
            paramIdx++;
          }

          const baseWhere = conditions.join(' AND ');
          const { ids, total } = await MatchingService.getScoredProjectIds(profile, baseWhere, params, page, limit);
          totalCount = total;

          if (ids.length > 0) {
            // Hydrate only the page of projects with full includes
            const projects = await prisma.founderProject.findMany({
              where: { id: { in: ids } },
              include: include as any
            });
            // Preserve the score-based order from SQL
            const idOrder = new Map(ids.map((id, i) => [id, i]));
            paginatedProjects = projects.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));
          } else {
            paginatedProjects = [];
          }
        } else {
          // Freelancer not found, fall back to newest
          const [count, projects] = await Promise.all([
            prisma.founderProject.count({ where: whereClause }),
            prisma.founderProject.findMany({ where: whereClause, include: include as any, orderBy: { created_at: 'desc' }, skip: (page - 1) * limit, take: limit })
          ]);
          totalCount = count;
          paginatedProjects = projects;
        }
      } else if (hasBudgetFilter) {
        // ── Budget filter path: budget is a string, need JS filter then paginate ──
        let allProjects = await prisma.founderProject.findMany({
          where: whereClause,
          include: include as any,
          orderBy
        });
        allProjects = allProjects.filter(matchesBudget);
        totalCount = allProjects.length;
        paginatedProjects = allProjects.slice((page - 1) * limit, page * limit);
      } else {
        // ── Fast path: all filters at DB level, use DB pagination ──
        const [count, projects] = await Promise.all([
          prisma.founderProject.count({ where: whereClause }),
          prisma.founderProject.findMany({
            where: whereClause,
            include: include as any,
            orderBy,
            skip: (page - 1) * limit,
            take: limit
          })
        ]);
        totalCount = count;
        paginatedProjects = projects;
      }

      // Transform projects
      const transformedProjects = await Promise.all(paginatedProjects.map(async (project: any) => {
        const { invites, savedByUsers, subcategory, _match_score, _matched_skills, ...projectData } = project;
        const currencySymbol = project.user?.currency?.symbol || '₹';
        if (projectData.user) {
          maskUserName(projectData.user);
          if (projectData.user.personalInfo?.profileImage) {
            projectData.user.personalInfo.profileImage = await resolveAttachmentUrl(projectData.user.personalInfo.profileImage, 'profile_image');
          }
        }
        return {
          ...projectData,
          subCategory: subcategory,
          budget_currency: currencySymbol,
          project_files: project.project_files
            ? await resolveAttachmentUrls(project.project_files as string[], 'founder_project_files')
            : [],
          scaledux_url: `${FRONTEND_URL}/project/${project.unique_id}`,
          is_saved: userId ? (savedByUsers?.length > 0) : false,
          is_invited: userId ? (invites?.length > 0) : false,
          match_score: _match_score ?? 0,
          matched_skills: _matched_skills ?? []
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
            unique_id: true,
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
      const isPublished = project.status === ProjectStatus.PUBLISHED;

      // Non-owners: allow if published, or if the user has a real proposal on it.
      // Anyone who submitted needs to keep reading the project after it leaves
      // PUBLISHED — the awarded freelancer through OFFER_ACCEPTED → HIRED →
      // PROJECT_COMPLETED, and the rest to see why their proposal ended.
      // (Matching only HIRED would lock the awarded freelancer out between
      // accepting the offer and the first payment, and again once completed.)
      if (!isOwner && !isPublished) {
        if (userId) {
          const ownProposal = await (prisma as any).proposal.findFirst({
            where: {
              project_id: project.id,
              provider_id: userId,
              is_draft: false
            }
          });
          if (!ownProposal) {
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

      // Fetch client stats for the project owner
      const ownerId = project.user_id;
      const [projectsPosted, openProjects, totalHired, activeHired, ownerUser, reviewsCount] = await Promise.all([
        prisma.founderProject.count({ where: { user_id: ownerId, deleted_at: null } }),
        prisma.founderProject.count({ where: { user_id: ownerId, status: 'PUBLISHED', deleted_at: null } }),
        prisma.proposal.count({
          where: { project: { user_id: ownerId }, status: 'HIRED' }
        }),
        prisma.proposal.count({
          where: { project: { user_id: ownerId }, status: { in: ['HIRED', 'TERMINATING'] } }
        }),
        (prisma as any).user.findUnique({ where: { id: ownerId }, select: { avg_rating: true } }),
        prisma.review.count({ where: { review_to_id: ownerId, review_type: 'PUBLIC' } })
      ]);

      const averageRating = Number(ownerUser?.avg_rating) || 0;
      const hireRate = projectsPosted > 0
        ? Math.round((totalHired / projectsPosted) * 100)
        : 0;

      // Transform file URLs and remove relation data from response
      const { invites, savedByUsers, subcategory, category: cat, ...projectData } = project as any;
      if (!isOwner && projectData.user) maskUserName(projectData.user);
      // Resolve founder profile image
      if (projectData.user?.personalInfo?.profileImage) {
        projectData.user.personalInfo.profileImage = await resolveAttachmentUrl(projectData.user.personalInfo.profileImage, 'profile_image');
      }
      // Use user's currency symbol if available
      const currencySymbol = (project as any).user?.currency?.symbol || '₹';
      const transformedProject = {
        ...projectData,
        category_id: projectData.expertise_category_id,
        sub_category_id: projectData.specialty_id,
        category: cat,
        subCategory: subcategory,
        budget_currency: currencySymbol,
        project_files: project.project_files
          ? await resolveAttachmentUrls(project.project_files as string[], 'founder_project_files')
          : [],
        scaledux_url: `${FRONTEND_URL}/project/${project.unique_id}`,
        is_saved: isSavedByUser,
        is_invited: isInvitedUser,
        invite_status: inviteStatus,
        invitation_message: invitationMessageForViewer,
        invitation_date: inviteData?.created_at || null,
        is_owner: isOwner,
        client_stats: {
          projects_posted: projectsPosted,
          open_projects: openProjects,
          total_hired: totalHired,
          active_hired: activeHired,
          hire_rate: hireRate,
          average_rating: averageRating,
          reviews_count: reviewsCount
        }
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
          project_description: data.projectDescription || null,
          expertise_category_id: data.categoryId || null,
          specialty_id: data.subCategoryId || null,
          project_files: projectFiles,
          scope_of_work: data.scopeOfWork || null,
          skills_required: data.skillsRequired || [],
          experience_needed: data.experienceNeeded || null,
          budget_currency: data.budget?.currency || null,
          budget_amount: data.budget?.amount || null,
          is_nda_required: data.isNdaRequired === 'yes',
          screening_questions: data.screeningQuestions || [],
          advanced_preferences: data.advancedPreferences ? {
            english_level: data.advancedPreferences.englishLevel,
            hire_within: data.advancedPreferences.hireWithin,
            time_requirement: data.advancedPreferences.timeRequirement,
            earned_amount: data.advancedPreferences.earnedAmount,
            location: data.advancedPreferences.loccation,
            estimated_hours: data.advancedPreferences.estimatedHours ?? null,
            service_provider_type: data.advancedPreferences.serviceProviderType ?? ''
          } : {},
          status: data.status || 'DRAFT'
        }
      });

      // Mark uploaded files as attached
      if (projectFiles.length > 0) {
        await markAttachmentsAttached(projectFiles, [userId]);
      }

      // Notify the founder when the project goes live on creation
      if (project.status === 'PUBLISHED') {
        await FounderProjectService.notifyProjectPublished(userId, project);
      }

      // Transform file URLs for response
      const transformedProject = {
        ...project,
        project_files: await resolveAttachmentUrls((project.project_files as string[]) || [], 'founder_project_files'),
        scaledux_url: `${FRONTEND_URL}/project/${project.unique_id}`
      };

      return {
        success: true,
        message: data.status === 'DRAFT' ? "Draft saved successfully" : "Project created successfully",
        data: transformedProject
      };
    } catch (error: any) {
      Log.error("Create Project Error", { error: error.message, stack: error.stack });
      const msg = error?.meta?.cause || error?.message || "Failed to create project";
      return {
        success: false,
        message: typeof msg === 'string' ? msg : "Failed to create project"
      };
    }
  }

  /**
   * Notify the founder (in-app + email) that their project is now published/live.
   * Best-effort: never blocks or fails the publish action.
   */
  private static async notifyProjectPublished(
    userId: number,
    project: { id: number; unique_id: string; project_title: string | null }
  ): Promise<void> {
    try {
      const title = project.project_title || "Your project";
      const notifData = {
        userId,
        type: 'PROJECT_PUBLISHED' as const,
        notificationTitle: 'Your project is published',
        notificationBody: `"${title}" is now live. Experts can find it and send proposals.`,
        notificationLink: `${FRONTEND_URL}/project/${project.unique_id}`,
        actorId: userId,
        subjectType: 'FounderProject' as const,
        subjectId: project.id
      };
      await dispatch(NotificationJob, notifData);
      await dispatch(NotificationEmailJob, notifData);
    } catch (error: any) {
      Log.error("Notify Project Published Error", { error });
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

      // IN_PROGRESS / COMPLETED are owned by the contract, not the founder: the
      // offer-accept and completion flows set them. Without this, a founder could
      // PATCH status back to PUBLISHED and re-list a project that already has a
      // live contract, taking fresh proposals nobody can act on.
      const engagedStatuses: string[] = [ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETED];
      if (
        data.status !== undefined &&
        String(data.status) !== '' &&
        engagedStatuses.includes(existingProject.status)
      ) {
        return {
          success: false,
          message:
            existingProject.status === ProjectStatus.COMPLETED
              ? "This project is completed and can no longer be republished."
              : "This project has an active contract and can't be republished."
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
          estimated_hours: data.advancedPreferences.estimatedHours ?? currentPrefs.estimated_hours ?? null,
          service_provider_type: data.advancedPreferences.serviceProviderType ?? currentPrefs.service_provider_type ?? ''
        };
      }

      const updatedProject = await prisma.founderProject.update({
        where: { id: existingProject.id },
        data: updateData
      });

      // Mark uploaded files as attached
      const fileIds = (updatedProject.project_files as string[]) || [];
      if (fileIds.length > 0) {
        await markAttachmentsAttached(fileIds, [userId]);
      }

      // Notify the founder when the project transitions from draft to published
      if (updatedProject.status === 'PUBLISHED' && existingProject.status !== 'PUBLISHED') {
        await FounderProjectService.notifyProjectPublished(userId, updatedProject);
      }

      // Transform file URLs
      const transformedProject = {
        ...updatedProject,
        project_files: await resolveAttachmentUrls((updatedProject.project_files as string[]) || [], 'founder_project_files'),
        scaledux_url: `${FRONTEND_URL}/project/${updatedProject.unique_id}`
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

      // A project with live engagement (pending invites or active proposals) can't be deleted —
      // it would silently drop experts who are mid-flow. Founder must unpublish (close) first,
      // which revokes invites and archives proposals; the resulting draft can then be deleted.
      const [pendingInviteCount, activeProposalCount] = await Promise.all([
        prisma.projectInvite.count({
          where: { project_id: project.id, status: InviteStatus.PENDING }
        }),
        (prisma as any).proposal.count({
          where: {
            project_id: project.id,
            is_draft: false,
            status: {
              in: [
                ProposalStatus.PENDING,
                ProposalStatus.SHORTLISTED,
                ProposalStatus.OFFER_SENT,
                ProposalStatus.OFFER_ACCEPTED,
                ProposalStatus.HIRED,
                ProposalStatus.TERMINATING,
                ProposalStatus.PROJECT_COMPLETED
              ]
            }
          }
        })
      ]);
      if (pendingInviteCount > 0 || activeProposalCount > 0) {
        return {
          success: false,
          message: "PROJECT_HAS_ENGAGEMENT"
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
   * Unpublish a project (move back to DRAFT).
   * Revokes all pending invites and silently archives all open proposals (PENDING/SHORTLISTED)
   * so experts are no longer engaged. Blocked while any offer is out or someone is hired.
   */
  static async unpublishProject(userId: number, uniqueId: string): Promise<ServiceResponse> {
    try {
      const project = await prisma.founderProject.findFirst({
        where: { unique_id: uniqueId, user_id: userId, deleted_at: null }
      });

      if (!project) {
        return { success: false, message: "Project not found" };
      }

      // Can't unpublish while a contract is live — that would orphan an active offer/hire.
      const activeContractCount = await (prisma as any).proposal.count({
        where: {
          project_id: project.id,
          is_draft: false,
          status: {
            in: [
              ProposalStatus.OFFER_SENT,
              ProposalStatus.OFFER_ACCEPTED,
              ProposalStatus.HIRED,
              ProposalStatus.TERMINATING,
              ProposalStatus.PROJECT_COMPLETED
            ]
          }
        }
      });
      if (activeContractCount > 0) {
        return { success: false, message: "PROJECT_HAS_ACTIVE_CONTRACT" };
      }

      await prisma.$transaction([
        // Revoke all pending invites
        prisma.projectInvite.updateMany({
          where: { project_id: project.id, status: InviteStatus.PENDING },
          data: { status: InviteStatus.REJECTED }
        }),
        // Silently ignore (archive) all open proposals — no notification to the expert
        (prisma as any).proposal.updateMany({
          where: {
            project_id: project.id,
            is_draft: false,
            status: { in: [ProposalStatus.PENDING, ProposalStatus.SHORTLISTED] }
          },
          data: { status: ProposalStatus.ARCHIVED }
        }),
        // Move the project back to draft and clear active counters
        prisma.founderProject.update({
          where: { id: project.id },
          data: { status: 'DRAFT', invited_count: 0, proposals_count: 0 }
        })
      ]);

      return {
        success: true,
        message: "Project unpublished and moved to draft",
        data: null
      };
    } catch (error: any) {
      Log.error("Unpublish Project Error", { error });
      return { success: false, message: "Failed to unpublish project" };
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
        project_files: await resolveAttachmentUrls((duplicatedProject.project_files as string[]) || [], 'founder_project_files'),
        scaledux_url: `${FRONTEND_URL}/project/${duplicatedProject.unique_id}`
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
    filter: 'all' | 'invited' | 'saved' = 'all',
    advancedFilters?: {
      earnedMin?: number;
      ratingMin?: number;
      hourlyRateMin?: number;
      hourlyRateMax?: number;
      providerType?: string;
      englishLevel?: string[];
      search?: string;
    }
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

      // Build where clause based on filter. Only expose service providers
      // whose own profile meets the required completion bar — keeps the
      // "Receive invite → NO" rule for incomplete providers consistent with
      // the browse-projects filter applied elsewhere.
      let whereClause: any = {
        role: 'freelancer',
        id: { not: userId },
        status: 1,
        profile_completion_percentage: { gte: PROFILE_COMPLETION_THRESHOLD }
      };

      if (filter === 'all') {
        // Only show freelancers with at least one expertise matching the project's category or skills
        const relevanceFilter: any[] = [];
        if (project.expertise_category_id) {
          relevanceFilter.push({ expertises: { some: { categoryId: project.expertise_category_id } } });
        }
        // Also include freelancers with matching skills (even if different category)
        if (projectSkills.length > 0) {
          for (const skill of projectSkills) {
            relevanceFilter.push({ expertises: { some: { skills: { array_contains: [skill] } } } });
          }
        }
        if (relevanceFilter.length > 0) {
          whereClause.OR = relevanceFilter;
        }
      } else if (filter === 'invited') {
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

      // Apply advanced filters at DB level
      if (advancedFilters) {
        const andConditions: any[] = [];

        // Hourly rate range
        if (advancedFilters.hourlyRateMin !== undefined || advancedFilters.hourlyRateMax !== undefined) {
          const rateFilter: any = {};
          if (advancedFilters.hourlyRateMin !== undefined) rateFilter.gte = advancedFilters.hourlyRateMin;
          if (advancedFilters.hourlyRateMax !== undefined) rateFilter.lte = advancedFilters.hourlyRateMax;
          andConditions.push({ personalInfo: { hourly_rate: rateFilter } });
        }

        // Provider type (freelancer/agency)
        if (advancedFilters.providerType && advancedFilters.providerType !== 'any') {
          const isAgency = advancedFilters.providerType === 'agency';
          andConditions.push({ personalInfo: { show_as_agency: isAgency } });
        }

        // Search by name
        if (advancedFilters.search) {
          andConditions.push({
            OR: [
              { first_name: { contains: advancedFilters.search, mode: 'insensitive' } },
              { last_name: { contains: advancedFilters.search, mode: 'insensitive' } },
              { personalInfo: { title: { contains: advancedFilters.search, mode: 'insensitive' } } }
            ]
          });
        }

        if (andConditions.length > 0) {
          whereClause.AND = [...(whereClause.AND || []), ...andConditions];
        }
      }

      // Fetch freelancers (include preference for mandatory section check)
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
          },
          preference: {
            select: { profile_sections: true }
          }
        }
      });

      // Filter out freelancers with incomplete mandatory sections (only for 'all' tab; invited/saved always show)
      const eligibleFreelancers = filter === 'all'
        ? freelancers.filter((f: any) => {
            const sections = (f.preference?.profile_sections as ProfileCompletionSectionsMap) || null;
            return areMandatorySectionsComplete(sections, f.role || 'freelancer');
          })
        : freelancers;

      // Transform freelancers to provider format with matching scores
      const providers = await Promise.all(eligibleFreelancers.map(async freelancer => {
        const userSkills: string[] = [];
        freelancer.expertises.forEach((exp: any) => {
          if (exp.skills && Array.isArray(exp.skills)) {
            userSkills.push(...(exp.skills as string[]));
          }
        });

        // Compute match score
        const matchResult = MatchingService.scoreFreelancerForProject(freelancer, project);

        const invite = inviteMap.get(freelancer.id);
        const isInvited = pendingInvitedProviderIds.includes(freelancer.id);
        const isSaved = savedProviderIds.includes(freelancer.id);

        const { firstName, lastName } = getDisplayName(freelancer, { maskLastName: true });
        return {
          id: freelancer.id,
          unique_id: freelancer.unique_id,
          first_name: firstName,
          last_name: lastName ?? '',
          email: freelancer.email,
          profile_image: freelancer.personalInfo?.profileImage
            ? await resolveAttachmentUrl(freelancer.personalInfo.profileImage, 'profile_image')
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
          matched_skills: matchResult.matched_skills,
          match_score: matchResult.match_score,
          service_packages_count: freelancer.servicePackages.length,
          total_earned: 0,
          projects_completed: freelancer.servicePackages.length,
          rating: 0,
          reviews_count: 0,
          is_invited: isInvited,
          invite_status: (invite as any)?.status || null,
          invited_at: (invite as any)?.created_at || null,
          is_saved: isSaved,
          invite_rejection_reason: (invite as any)?.status === ProposalStatus.REJECTED ? (invite as any)?.message || null : null,
          invite_rejection_main_reason: (invite as any)?.status === ProposalStatus.REJECTED ? (invite as any)?.main_reason || null : null
        };
      }));

      // For recommended tab, exclude providers with no relevance at all
      let filteredProviders = filter === 'all'
        ? providers.filter(p => p.match_score > 0 || p.matched_skills.length > 0)
        : providers;

      // Apply advanced filters that need JS (rating, earned — need aggregated data)
      if (advancedFilters) {
        if (advancedFilters.ratingMin !== undefined) {
          filteredProviders = filteredProviders.filter(p => p.rating >= advancedFilters.ratingMin!);
        }
        if (advancedFilters.earnedMin !== undefined) {
          filteredProviders = filteredProviders.filter(p => p.total_earned >= advancedFilters.earnedMin!);
        }
      }

      // Sort providers
      if (sortBy === 'relevance') {
        filteredProviders.sort((a, b) => b.match_score - a.match_score);
      } else if (sortBy === 'hourly_rate') {
        filteredProviders.sort((a, b) => (a.hourly_rate || 0) - (b.hourly_rate || 0));
      } else if (sortBy === 'rating') {
        filteredProviders.sort((a, b) => b.rating - a.rating);
      } else if (sortBy === 'projects_completed') {
        filteredProviders.sort((a, b) => b.projects_completed - a.projects_completed);
      }

      // Pagination
      const total = filteredProviders.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const paginatedProviders = filteredProviders.slice(offset, offset + limit);

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
      // Get the project with founder name
      const project = await prisma.founderProject.findFirst({
        where: {
          unique_id: projectId,
          user_id: userId,
          deleted_at: null
        },
        include: {
          user: { select: { first_name: true, last_name: true } }
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
        message || "",
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

      const founderDn = project.user ? getDisplayName(project.user, { maskLastName: true }) : null;
      const founderName = founderDn ? [founderDn.firstName, founderDn.lastName].filter(Boolean).join(' ') : 'Someone';
      const notificationTitle = `${founderName} invited you to "${projectTitle}"`;
      const bodyParts = [`${founderName} invited you to submit a proposal for "${projectTitle}".`];
      if (message) bodyParts.push(`"${message}"`);
      const notificationBody = bodyParts.join('\n\n');
      const notificationLink = `${appConfig.frontendUrl}/project/${project.unique_id}`;

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
   * Revoke an invitation (founder withdraws a pending invite before the provider acts).
   * Only PENDING invites can be revoked; accepted/rejected ones are left as-is.
   * Deletes the invite so the provider becomes invitable again and decrements the count.
   */
  static async revokeInvitation(
    userId: number,
    projectId: string,
    providerId: number
  ): Promise<ServiceResponse> {
    try {
      const project = await prisma.founderProject.findFirst({
        where: { unique_id: projectId, user_id: userId, deleted_at: null }
      });

      if (!project) {
        return { success: false, message: "Project not found" };
      }

      const invite = await (prisma as any).projectInvite.findUnique({
        where: {
          project_id_provider_id: { project_id: project.id, provider_id: providerId }
        }
      });

      if (!invite) {
        return { success: false, message: "No invitation found for this provider" };
      }

      if (invite.status !== InviteStatus.PENDING) {
        return { success: false, message: "INVITE_NOT_PENDING" };
      }

      await prisma.$transaction([
        (prisma as any).projectInvite.delete({
          where: {
            project_id_provider_id: { project_id: project.id, provider_id: providerId }
          }
        }),
        prisma.founderProject.update({
          where: { id: project.id },
          data: { invited_count: { decrement: 1 } }
        })
      ]);

      // Tell the provider their pending invite was withdrawn (chat + in-app + email)
      const projectTitle = project.project_title || "a project";
      await ConversationService.syncSystemMessage(
        project.user_id,
        providerId,
        "",
        {
          activityType: "project_invitation_revoked",
          activityId: project.unique_id,
          projectTitle: project.project_title,
          messageSent: `You withdrew your invitation for "${projectTitle}"`,
          messageReceived: `The client withdrew the invitation for "${projectTitle}"`
        },
        project.id,
        project.user_id
      );
      const revokeNotif = {
        userId: providerId,
        type: 'INVITATION_REVOKED' as const,
        notificationTitle: 'Invitation withdrawn',
        notificationBody: `The invitation to "${projectTitle}" has been withdrawn by the client.`,
        notificationLink: `${appConfig.frontendUrl}/project/${project.unique_id}`,
        actorId: userId,
        subjectType: 'FounderProject' as const,
        subjectId: project.id
      };
      await dispatch(NotificationJob, revokeNotif);
      await dispatch(NotificationEmailJob, revokeNotif);

      return {
        success: true,
        message: "Invitation revoked successfully",
        data: null
      };
    } catch (error: any) {
      Log.error("Revoke Invitation Error", { error });
      return { success: false, message: "Failed to revoke invitation" };
    }
  }

  /**
   * Reject an invitation (service provider rejects founder's invitation).
   * Stores predefined reason key + optional message. Founder sees the rejection reason.
   */
  static async rejectInvitation(
    userId: number,
    projectId: string,
    payload: { reason_key?: string; reason_message?: string }
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

      const reasonKey = payload.reason_key?.trim() || null;
      const reasonMsg = payload.reason_message?.trim() || null;
      // Build combined display text from reason key + message
      const parts = [reasonKey, reasonMsg].filter(Boolean);
      const displayReason = parts.length > 0 ? parts.join('. ') : null;

      const providerName = await getUserFullName(userId);
      const freelancerRemark = displayReason
        ? `You declined the invitation. ${displayReason}`
        : 'You declined the invitation';
      const founderRemark = displayReason
        ? `${providerName} declined the invitation. Reason: ${displayReason}`
        : `${providerName} declined the invitation`;

      // Update the invite status to REJECTED and store rejection reason
      await (prisma as any).projectInvite.update({
        where: {
          project_id_provider_id: {
            project_id: project.id,
            provider_id: userId
          }
        },
        data: {
          status: ProposalStatus.REJECTED,
          message: displayReason,
          main_reason: reasonKey,
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
          messageSent: founderRemark,
          messageReceived: freelancerRemark
        },
        project.id,
        userId
      );

      const notificationLink = `${appConfig.frontendUrl}/project/${project.unique_id}`;
      const rejectionBody = displayReason
        ? `${providerName} declined your invitation for "${projectTitle}".\n\nReason: "${displayReason}"`
        : `${providerName} declined your invitation for "${projectTitle}".`;
      const notifData = { userId: project.user_id, type: 'INVITATION_REJECTED' as const, notificationTitle: `${providerName} declined your invitation`, notificationBody: rejectionBody, notificationLink: notificationLink ?? null, actorId: userId, subjectType: 'FounderProject' as const, subjectId: project.id };
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

      const accepterName = await getUserFullName(userId);
      const notificationLink = `${appConfig.frontendUrl}/project/${project.unique_id}`;
      const notifData = { userId: project.user_id, type: 'INVITATION_ACCEPTED' as const, notificationTitle: `${accepterName} accepted your invitation`, notificationBody: `${accepterName} accepted your invitation for "${projectTitle}".`, notificationLink: notificationLink ?? null, actorId: userId, subjectType: 'FounderProject' as const, subjectId: project.id };
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
        message: isSaved ? "Expert unsaved" : "Expert saved",
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
   * Get ALL experts the founder has saved across any of their projects (global, deduped).
   */
  static async getSavedProviders(userId: number): Promise<ServiceResponse> {
    try {
      const projects = await prisma.founderProject.findMany({
        where: { user_id: userId, deleted_at: null },
        select: { saved_providers: true }
      });

      const idSet = new Set<number>();
      for (const p of projects) {
        for (const id of (((p as any).saved_providers as number[]) || [])) {
          if (typeof id === 'number') idSet.add(id);
        }
      }
      const ids = [...idSet];

      if (ids.length === 0) {
        return { success: true, message: "Saved experts retrieved successfully", data: { providers: [] } };
      }

      const freelancers = await prisma.user.findMany({
        where: { id: { in: ids }, role: 'freelancer', status: 1 },
        include: {
          personalInfo: { include: { country: { select: { id: true, name: true, code: true } } } },
          expertises: true,
          servicePackages: { where: { status: 'PUBLISHED' }, select: { id: true } }
        }
      });

      const providers = await Promise.all(freelancers.map(async (f: any) => {
        const skills: string[] = [];
        f.expertises.forEach((exp: any) => {
          if (Array.isArray(exp.skills)) skills.push(...(exp.skills as string[]));
        });
        const { firstName, lastName } = getDisplayName(f, { maskLastName: true });
        return {
          id: f.id,
          unique_id: f.unique_id,
          first_name: firstName,
          last_name: lastName ?? '',
          profile_image: f.personalInfo?.profileImage
            ? await resolveAttachmentUrl(f.personalInfo.profileImage, 'profile_image')
            : null,
          title: f.personalInfo?.title || null,
          hourly_rate: f.personalInfo?.hourly_rate || null,
          country: f.personalInfo?.country || null,
          all_skills: skills,
          matched_skills: skills.slice(0, 4),
          projects_completed: f.servicePackages.length,
          rating: 0,
          reviews_count: 0,
          is_saved: true
        };
      }));

      return {
        success: true,
        message: "Saved experts retrieved successfully",
        data: { providers }
      };
    } catch (error: any) {
      Log.error("Get Saved Providers Error", { error });
      return { success: false, message: "Failed to get saved experts" };
    }
  }

  /**
   * Remove an expert from the founder's saved list everywhere (across all their projects).
   */
  static async unsaveProvider(userId: number, providerId: number): Promise<ServiceResponse> {
    try {
      const projects = await prisma.founderProject.findMany({
        where: { user_id: userId, deleted_at: null },
        select: { id: true, saved_providers: true }
      });

      const updates = [];
      for (const p of projects) {
        const saved = (((p as any).saved_providers as number[]) || []);
        if (saved.includes(providerId)) {
          updates.push(
            (prisma.founderProject.update as any)({
              where: { id: p.id },
              data: { saved_providers: saved.filter((id) => id !== providerId) }
            })
          );
        }
      }

      if (updates.length > 0) {
        await prisma.$transaction(updates);
      }

      return { success: true, message: "Expert removed from saved", data: null };
    } catch (error: any) {
      Log.error("Unsave Provider Error", { error });
      return { success: false, message: "Failed to remove saved expert" };
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
