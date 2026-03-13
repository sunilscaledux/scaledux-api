import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { getFileUrl, getRelativePath } from '@utils/General';
import { Log } from '@services/loggerService';

/**
 * TeamMemberService
 * Handles all team member operations for company profiles
 */
export class TeamMemberService {
  /**
   * Get all team members for a company profile
   */
  static async getTeamMembers(userId: number): Promise<ServiceResponse> {
    try {
      // Get company profile first
      const companyProfile = await prisma.companyProfile.findUnique({
        where: { user_id: userId }
      });

      if (!companyProfile) {
        return {
          success: false,
          message: 'Company profile not found'
        };
      }

      const teamMembers = await prisma.teamMember.findMany({
        where: { 
          company_profile_id: companyProfile.id,
          is_active: true
        },
        include: {
          role: true
        },
        orderBy: { created_at: 'desc' }
      });

      // Transform profile images to full URLs
      const transformedMembers = teamMembers.map(member => ({
        ...member,
        profile_image: member.profile_image ? getFileUrl(member.profile_image) : null
      }));

      return {
        success: true,
        message: 'Team members retrieved successfully',
        data: transformedMembers
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to retrieve team members'
      };
    }
  }

  /**
   * Get a single team member by unique_id
   */
  static async getTeamMemberById(userId: number, uniqueId: string): Promise<ServiceResponse> {
    try {
      const companyProfile = await prisma.companyProfile.findUnique({
        where: { user_id: userId }
      });

      if (!companyProfile) {
        return {
          success: false,
          message: 'Company profile not found'
        };
      }

      const teamMember = await prisma.teamMember.findFirst({
        where: { 
          unique_id: uniqueId,
          company_profile_id: companyProfile.id
        },
        include: {
          role: true
        }
      });

      if (!teamMember) {
        return {
          success: false,
          message: 'Team member not found'
        };
      }

      const transformedMember = {
        ...teamMember,
        profile_image: teamMember.profile_image ? getFileUrl(teamMember.profile_image) : null
      };

      return {
        success: true,
        message: 'Team member retrieved successfully',
        data: transformedMember
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to retrieve team member'
      };
    }
  }

  /**
   * Create a new team member
   */
  static async createTeamMember(userId: number, data: {
    name: string;
    email?: string;
    role_id: number;
    bio?: string;
    linkedin_url?: string;
  }): Promise<ServiceResponse> {
    try {
      const companyProfile = await prisma.companyProfile.findUnique({
        where: { user_id: userId }
      });

      if (!companyProfile) {
        return {
          success: false,
          message: 'Company profile not found'
        };
      }

      const teamMember = await prisma.teamMember.create({
        data: {
          company_profile_id: companyProfile.id,
          ...data
        },
        include: {
          role: true
        }
      });

      return {
        success: true,
        message: 'Team member created successfully',
        data: teamMember
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to create team member'
      };
    }
  }

  /**
   * Update a team member
   */
  static async updateTeamMember(userId: number, uniqueId: string, data: {
    name?: string;
    email?: string;
    role_id?: number;
    bio?: string;
    linkedin_url?: string;
  }): Promise<ServiceResponse> {
    try {
      const companyProfile = await prisma.companyProfile.findUnique({
        where: { user_id: userId }
      });

      if (!companyProfile) {
        return {
          success: false,
          message: 'Company profile not found'
        };
      }

      // Verify team member belongs to this company
      const existingMember = await prisma.teamMember.findFirst({
        where: { 
          unique_id: uniqueId,
          company_profile_id: companyProfile.id
        }
      });

      if (!existingMember) {
        return {
          success: false,
          message: 'Team member not found'
        };
      }

      const teamMember = await prisma.teamMember.update({
        where: { id: existingMember.id },
        data,
        include: {
          role: true
        }
      });

      return {
        success: true,
        message: 'Team member updated successfully',
        data: teamMember
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to update team member'
      };
    }
  }

  /**
   * Upload team member profile image
   */
  static async uploadProfileImage(userId: number, uniqueId: string, file: any): Promise<ServiceResponse> {
    try {
      const companyProfile = await prisma.companyProfile.findUnique({
        where: { user_id: userId }
      });

      if (!companyProfile) {
        return {
          success: false,
          message: 'Company profile not found'
        };
      }

      // Verify team member belongs to this company
      const existingMember = await prisma.teamMember.findFirst({
        where: { 
          unique_id: uniqueId,
          company_profile_id: companyProfile.id
        }
      });

      if (!existingMember) {
        return {
          success: false,
          message: 'Team member not found'
        };
      }

      const relativePath = getRelativePath(file.path);

      const teamMember = await prisma.teamMember.update({
        where: { id: existingMember.id },
        data: { profile_image: relativePath }
      });

      return {
        success: true,
        message: 'Profile image uploaded successfully',
        data: {
          profile_image: getFileUrl(relativePath)
        }
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to upload profile image'
      };
    }
  }

  /**
   * Delete a team member (soft delete)
   */
  static async deleteTeamMember(userId: number, uniqueId: string): Promise<ServiceResponse> {
    try {
      const companyProfile = await prisma.companyProfile.findUnique({
        where: { user_id: userId }
      });

      if (!companyProfile) {
        return {
          success: false,
          message: 'Company profile not found'
        };
      }

      // Verify team member belongs to this company
      const existingMember = await prisma.teamMember.findFirst({
        where: { 
          unique_id: uniqueId,
          company_profile_id: companyProfile.id
        }
      });

      if (!existingMember) {
        return {
          success: false,
          message: 'Team member not found'
        };
      }

      await prisma.teamMember.update({
        where: { id: existingMember.id },
        data: { is_active: false }
      });

      return {
        success: true,
        message: 'Team member deleted successfully'
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to delete team member'
      };
    }
  }
}
