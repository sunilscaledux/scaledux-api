import { prisma } from "@services/prismaService";
import { CreateFounderProjectInput, UpdateFounderProjectInput } from "./FounderProjectType";
import { ServiceResponse } from "@utils/ApiResponse";
import { getRelativePath, getFileUrl, normalizeUploadedPaths } from '@utils/General';
import { ulid } from 'ulid';

export class FounderProjectService {
  /**
   * Get all founder projects for a user
   */
  static async getUserProjects(userId: number, status?: string): Promise<ServiceResponse> {
    try {
      const whereClause: any = { user_id: userId };
      if (status) {
        whereClause.status = status;
      }

      const projects = await prisma.founderProject.findMany({
        where: {
          ...whereClause,
          deleted_at: null
        },
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
        orderBy: { created_at: 'desc' }
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
        message: "Projects retrieved successfully",
        data: transformedProjects
      };
    } catch (error: any) {
      console.error("Get User Projects Error:", error);
      return {
        success: false,
        message: "Failed to get projects"
      };
    }
  }

  /**
   * Get a single project by unique ID
   */
  static async getProjectById(userId: number, uniqueId: string): Promise<ServiceResponse> {
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
}
