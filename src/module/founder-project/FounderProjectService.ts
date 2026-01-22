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

      // Transform file URLs to full URLs
      const transformedProjects = projects.map(project => ({
        ...project,
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
   * Get a single project by unique ID
   * If userId is provided, it checks ownership; otherwise returns any published project
   */
  static async getProjectById(userId: number | null, uniqueId: string): Promise<ServiceResponse> {
    try {
      const whereClause: any = {
        unique_id: uniqueId,
        deleted_at: null
      };

      // If no userId (public access), only show published projects
      if (!userId) {
        whereClause.status = 'PUBLISHED';
      }
      // If userId provided, show all their projects (including drafts)

      const project = await prisma.founderProject.findFirst({
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
          },
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              role: true,
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
        }
      });

      if (!project) {
        return {
          success: false,
          message: "Project not found"
        };
      }

      // If userId provided, verify ownership
      if (userId && project.user_id !== userId) {
        return {
          success: false,
          message: "Project not found"
        };
      }

      // Transform file URLs
      const transformedProject = {
        ...project,
        project_files: project.project_files
          ? (project.project_files as string[]).map((url: string) => getFileUrl(url))
          : []
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

      // Compute and store provider matches in background
      if (data.skillsRequired && data.skillsRequired.length > 0) {
        this.computeAndStoreMatches(project.id, userId, data.skillsRequired).catch(err => {
          console.error("Error computing provider matches:", err);
        });
      }

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
   * Compute and store provider matches for a project
   */
  static async computeAndStoreMatches(projectId: number, ownerId: number, skillsRequired: string[]): Promise<void> {
    try {
      // Get all freelancers with their expertise
      const freelancers = await prisma.user.findMany({
        where: {
          role: 'freelancer',
          id: { not: ownerId },
          status: 1
        },
        include: {
          expertises: true
        }
      });

      const matchesToCreate: Array<{
        project_id: number;
        provider_id: number;
        matched_skills: string[];
        match_score: number;
      }> = [];

      for (const freelancer of freelancers) {
        // Collect all skills from user's expertises
        const userSkills: string[] = [];
        freelancer.expertises.forEach(exp => {
          if (exp.skills && Array.isArray(exp.skills)) {
            userSkills.push(...(exp.skills as string[]));
          }
        });

        // Find matched skills (case-insensitive)
        const matchedSkills = skillsRequired.filter(reqSkill =>
          userSkills.some(userSkill =>
            userSkill.toLowerCase() === reqSkill.toLowerCase()
          )
        );

        // Only store if there's at least one match
        if (matchedSkills.length > 0) {
          const matchScore = (matchedSkills.length / skillsRequired.length) * 100;
          matchesToCreate.push({
            project_id: projectId,
            provider_id: freelancer.id,
            matched_skills: matchedSkills,
            match_score: matchScore
          });
        }
      }

      // Bulk insert matches
      if (matchesToCreate.length > 0) {
        await prisma.projectProviderMatch.createMany({
          data: matchesToCreate,
          skipDuplicates: true
        });
      }

      console.log(`Stored ${matchesToCreate.length} provider matches for project ${projectId}`);
    } catch (error) {
      console.error("Error in computeAndStoreMatches:", error);
      throw error;
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

      // Refresh provider matches if skills were updated
      if (data.skillsRequired !== undefined && data.skillsRequired.length > 0) {
        this.refreshProjectMatches(existingProject.id, userId, data.skillsRequired).catch(err => {
          console.error("Error refreshing provider matches:", err);
        });
      }

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
   * Get matching service providers (freelancers) for a project from stored matches
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

      const requiredSkills = (project.skills_required as string[]) || [];

      // Build where clause for matches based on filter
      const matchWhere: any = { project_id: project.id };
      if (filter === 'invited') {
        matchWhere.is_invited = true;
      } else if (filter === 'saved') {
        matchWhere.is_saved = true;
      }

      // Determine sort order
      let orderBy: any = { match_score: 'desc' };
      if (sortBy === 'hourly_rate') {
        orderBy = { provider: { personalInfo: { hourly_rate: 'asc' } } };
      }

      // Get stored matches with provider details
      const matches = await prisma.projectProviderMatch.findMany({
        where: matchWhere,
        include: {
          provider: {
            include: {
              personalInfo: {
                include: {
                  country: {
                    select: { id: true, name: true, code: true }
                  },
                  state: {
                    select: { id: true, name: true }
                  }
                }
              },
              expertises: {
                include: {
                  expertiseCategory: {
                    select: { id: true, name: true }
                  },
                  specialty: {
                    select: { id: true, name: true }
                  }
                }
              },
              servicePackages: {
                where: { status: 'PUBLISHED' },
                select: { id: true }
              }
            }
          }
        },
        orderBy: sortBy === 'relevance' ? { match_score: 'desc' } : undefined
      });

      // Transform data
      let providers = matches.map(match => {
        const freelancer = match.provider;
        const userSkills: string[] = [];
        freelancer.expertises.forEach(exp => {
          if (exp.skills && Array.isArray(exp.skills)) {
            userSkills.push(...(exp.skills as string[]));
          }
        });

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
          expertises: freelancer.expertises.map(exp => ({
            id: exp.id,
            category: exp.expertiseCategory,
            specialty: exp.specialty,
            skills: exp.skills || []
          })),
          all_skills: userSkills,
          matched_skills: match.matched_skills as string[],
          match_score: match.match_score,
          service_packages_count: freelancer.servicePackages.length,
          total_earned: 0,
          projects_completed: freelancer.servicePackages.length,
          rating: 0,
          reviews_count: 0,
          is_invited: match.is_invited,
          invited_at: match.invited_at,
          is_saved: match.is_saved
        };
      });

      // Sort in memory for non-relevance sorts
      if (sortBy === 'rating') {
        providers.sort((a, b) => b.rating - a.rating);
      } else if (sortBy === 'hourly_rate') {
        providers.sort((a, b) => (a.hourly_rate || 0) - (b.hourly_rate || 0));
      } else if (sortBy === 'projects_completed') {
        providers.sort((a, b) => b.projects_completed - a.projects_completed);
      }

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
          pagination: {
            page,
            limit,
            total,
            totalPages
          },
          project_skills: requiredSkills
        }
      };
    } catch (error: any) {
      console.error("Get Matching Service Providers Error:", error);
      return {
        success: false,
        message: "Failed to get matching service providers"
      };
    }
  }

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

      // Update the match record
      const match = await prisma.projectProviderMatch.updateMany({
        where: {
          project_id: project.id,
          provider_id: providerId
        },
        data: {
          is_invited: true,
          invited_at: new Date(),
          invitation_message: message || null
        }
      });

      if (match.count === 0) {
        return {
          success: false,
          message: "Provider match not found"
        };
      }

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

      // Get current match record
      const existingMatch = await prisma.projectProviderMatch.findUnique({
        where: {
          project_id_provider_id: {
            project_id: project.id,
            provider_id: providerId
          }
        }
      });

      if (!existingMatch) {
        return {
          success: false,
          message: "Provider match not found"
        };
      }

      // Toggle is_saved
      const updatedMatch = await prisma.projectProviderMatch.update({
        where: {
          project_id_provider_id: {
            project_id: project.id,
            provider_id: providerId
          }
        },
        data: {
          is_saved: !existingMatch.is_saved
        }
      });

      return {
        success: true,
        message: updatedMatch.is_saved ? "Provider saved" : "Provider unsaved",
        data: { is_saved: updatedMatch.is_saved }
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
   * Refresh matches for a project (useful when skills are updated)
   */
  static async refreshProjectMatches(projectId: number, ownerId: number, skillsRequired: string[]): Promise<void> {
    try {
      // Delete existing matches that haven't been invited or saved
      await prisma.projectProviderMatch.deleteMany({
        where: {
          project_id: projectId,
          is_invited: false,
          is_saved: false
        }
      });

      // Recompute matches
      await this.computeAndStoreMatches(projectId, ownerId, skillsRequired);
    } catch (error) {
      console.error("Error refreshing project matches:", error);
      throw error;
    }
  }
}
