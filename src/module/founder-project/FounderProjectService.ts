import { prisma } from "@services/prismaService";
import { CreateFounderProjectInput, UpdateFounderProjectInput } from "./FounderProjectType";
import { ServiceResponse } from "@utils/ApiResponse";
import { getRelativePath, getFileUrl, normalizeUploadedPaths } from '@utils/General';
import { ulid } from 'ulid';

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
        whereClause.category_id = categoryId;
      }

      // Search across title and description
      if (search) {
        whereClause.OR = [
          { project_title: { contains: search, mode: 'insensitive' } },
          { project_description: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Note: contractStatus, milestoneStatus, and date filters are passed but not used
      // because FounderProject schema doesn't have these fields
      // These filters are for contracts/milestones which are separate entities

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
          subCategory: {
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
      const transformedProjects = projects.map(project => ({
        ...project,
        budget_currency: currencySymbol,
        project_files: project.project_files
          ? (project.project_files as string[]).map((url: string) => getFileUrl(url))
          : []
      }));

      return {
        success: true,
        data: transformedProjects,
        message: "Projects retrieved successfully"
      };
    } catch (error: any) {
      console.error("Error in getUserProjects:", error);
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
        whereClause.category_id = { in: categoryIds };
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
        subCategory: {
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
          where: { provider_id: userId, status: 'PENDING' },
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
      const transformedProjects = paginatedProjects.map((project: any) => {
        const { invites, savedByUsers, ...projectData } = project;
        // Use user's currency symbol if available, otherwise fallback to budget_currency or default
        const currencySymbol = project.user?.currency?.symbol || '₹';
        return {
          ...projectData,
          budget_currency: currencySymbol,
          project_files: project.project_files
            ? (project.project_files as string[]).map((url: string) => getFileUrl(url))
            : [],
          is_saved: userId ? (savedByUsers?.length > 0) : false,
          is_invited: userId ? (invites?.length > 0) : false
        };
      });

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
      console.error("Error in browseProjects:", error);
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
        subCategory: {
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

      // Non-owners can only view published projects
      if (!isOwner && !isPublished) {
        return {
          success: false,
          message: "Project not found"
        };
      }

      // Check user status using relations (already filtered by userId in query)
      const isSavedByUser = !isOwner && (project as any).savedByUsers?.length > 0;
      const inviteData = (project as any).invites?.[0] || null;
      const inviteStatus = inviteData?.status || null;
      // is_invited = had a PENDING invite (for showing Accept/Reject). We also return invite_status so UI can show "Invitation rejected"
      const isInvitedUser = !isOwner && inviteStatus === 'PENDING';

      // Transform file URLs and remove relation data from response
      const { invites, savedByUsers, ...projectData } = project as any;
      // Use user's currency symbol if available
      const currencySymbol = (project as any).user?.currency?.symbol || '₹';
      const transformedProject = {
        ...projectData,
        budget_currency: currencySymbol,
        project_files: project.project_files
          ? (project.project_files as string[]).map((url: string) => getFileUrl(url))
          : [],
        is_saved: isSavedByUser,
        is_invited: isInvitedUser,
        invite_status: inviteStatus,
        invitation_message: inviteData?.message || null,
        invitation_date: inviteData?.created_at || null,
        is_owner: isOwner
      };

      return {
        success: true,
        message: "Project retrieved successfully",
        data: transformedProject
      };
    } catch (error: any) {
      console.error("Get Project By ID Error:", error);
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
      // Extract and normalize file paths
      const projectFiles = data.projectFiles?.map(file => getRelativePath(file.url)) || [];

      const project = await prisma.founderProject.create({
        data: {
          unique_id: ulid(),
          user_id: userId,
          project_title: data.projectTitle,
          project_description: data.projectDescription,
          category_id: data.categoryId,
          sub_category_id: data.subCategoryId || null,
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
            location: data.advancedPreferences.loccation
          },
          status: data.status || 'DRAFT'
        }
      });

      // Transform file URLs for response
      const transformedProject = {
        ...project,
        project_files: (project.project_files as string[]).map((url: string) => getFileUrl(url))
      };

      return {
        success: true,
        message: "Project created successfully",
        data: transformedProject
      };
    } catch (error: any) {
      console.error("Create Project Error:", error);
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
      if (data.categoryId !== undefined) updateData.category_id = data.categoryId;
      if (data.subCategoryId !== undefined) updateData.sub_category_id = data.subCategoryId;
      if (data.scopeOfWork !== undefined) updateData.scope_of_work = data.scopeOfWork;
      if (data.skillsRequired !== undefined) updateData.skills_required = data.skillsRequired;
      if (data.experienceNeeded !== undefined) updateData.experience_needed = data.experienceNeeded;
      if (data.isNdaRequired !== undefined) updateData.is_nda_required = data.isNdaRequired === 'yes';
      if (data.status !== undefined) updateData.status = data.status;

      if (data.projectFiles !== undefined) {
        updateData.project_files = data.projectFiles.map(file => getRelativePath(file.url));
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
          location: data.advancedPreferences.loccation ?? currentPrefs.location
        };
      }

      const updatedProject = await prisma.founderProject.update({
        where: { id: existingProject.id },
        data: updateData
      });

      // Transform file URLs
      const transformedProject = {
        ...updatedProject,
        project_files: (updatedProject.project_files as string[]).map((url: string) => getFileUrl(url))
      };

      return {
        success: true,
        message: "Project updated successfully",
        data: transformedProject
      };
    } catch (error: any) {
      console.error("Update Project Error:", error);
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
      console.error("Delete Project Error:", error);
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
          unique_id: ulid(),
          user_id: userId,
          project_title: `${originalProject.project_title} (Copy)`,
          project_description: originalProject.project_description,
          category_id: originalProject.category_id,
          sub_category_id: originalProject.sub_category_id,
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
        project_files: (duplicatedProject.project_files as string[]).map((url: string) => getFileUrl(url))
      };

      return {
        success: true,
        message: "Project duplicated successfully",
        data: transformedProject
      };
    } catch (error: any) {
      console.error("Duplicate Project Error:", error);
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
      const pendingInvites = invites.filter((i: any) => i.status === 'PENDING');
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
              expertiseCategory: { select: { id: true, name: true } },
              specialty: { select: { id: true, name: true } }
            }
          },
          servicePackages: {
            where: { status: 'PUBLISHED' },
            select: { id: true }
          }
        }
      });

      // Transform freelancers to provider format
      const providers = freelancers.map(freelancer => {
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
            ? getFileUrl(freelancer.personalInfo.profileImage) 
            : null,
          title: freelancer.personalInfo?.title || null,
          about: freelancer.personalInfo?.about || null,
          hourly_rate: freelancer.personalInfo?.hourly_rate || null,
          country: freelancer.personalInfo?.country || null,
          state: freelancer.personalInfo?.state || null,
          city: freelancer.personalInfo?.city || null,
          expertises: freelancer.expertises.map((exp: any) => ({
            id: exp.id,
            category: exp.expertiseCategory,
            specialty: exp.specialty,
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
          is_saved: isSaved
        };
      });

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
      console.error("Get Service Providers Error:", error);
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
        }
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

      return {
        success: true,
        message: "Invitation sent successfully",
        data: null
      };
    } catch (error: any) {
      console.error("Invite Provider Error:", error);
      return {
        success: false,
        message: "Failed to invite provider"
      };
    }
  }

  /**
   * Reject an invitation (service provider rejects founder's invitation)
   */
  static async rejectInvitation(
    userId: number,
    projectId: string
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
          status: 'PENDING'
        }
      });

      if (!invite) {
        return {
          success: false,
          message: "You don't have a pending invitation for this project"
        };
      }

      // Update the invite status to REJECTED
      await (prisma as any).projectInvite.update({
        where: {
          project_id_provider_id: {
            project_id: project.id,
            provider_id: userId
          }
        },
        data: {
          status: 'REJECTED'
        }
      });

      return {
        success: true,
        message: "Invitation rejected successfully"
      };
    } catch (error: any) {
      console.error("Reject Invitation Error:", error);
      return {
        success: false,
        message: "Failed to reject invitation"
      };
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
      console.error("Toggle Save Provider Error:", error);
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
      console.error("Toggle Save Project Error:", error);
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
