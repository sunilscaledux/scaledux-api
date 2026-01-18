import { Request, Response } from 'express';
import { TeamMemberService } from './TeamMemberService';
import { ApiResponse } from '@utils/ApiResponse';
import { createTeamMemberSchema, updateTeamMemberSchema } from './CompanyProfileValidation';

export class TeamMemberController {
  /**
   * Get all team members
   * GET /api/v1/profile/company/team-members
   */
  static async getTeamMembers(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const result = await TeamMemberService.getTeamMembers(userId);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      console.error('Get Team Members Error:', error);
      return ApiResponse.error(res, error.message || 'Failed to retrieve team members');
    }
  }

  /**
   * Get a single team member by ID
   * GET /api/v1/profile/company/team-members/:id
   */
  static async getTeamMemberById(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const uniqueId = req.params.id;

      if (!uniqueId) {
        return ApiResponse.error(res, 'Team member ID is required', 400);
      }

      const result = await TeamMemberService.getTeamMemberById(userId, uniqueId);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message, 404);
      }
    } catch (error: any) {
      console.error('Get Team Member Error:', error);
      return ApiResponse.error(res, error.message || 'Failed to retrieve team member');
    }
  }

  /**
   * Create a new team member
   * POST /api/v1/profile/company/team-members
   */
  static async createTeamMember(req: Request, res: Response) {
    try {
      const { error, value } = createTeamMemberSchema.validate(req.body, { abortEarly: false });
      
      if (error) {
        return ApiResponse.joiValidationError(res, error);
      }

      const userId = req.user.id;
      const result = await TeamMemberService.createTeamMember(userId, value);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message, 201);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      console.error('Create Team Member Error:', error);
      return ApiResponse.error(res, error.message || 'Failed to create team member');
    }
  }

  /**
   * Update a team member
   * PATCH /api/v1/profile/company/team-members/:id
   */
  static async updateTeamMember(req: Request, res: Response) {
    try {
      const { error, value } = updateTeamMemberSchema.validate(req.body, { abortEarly: false });
      
      if (error) {
        return ApiResponse.joiValidationError(res, error);
      }

      const userId = req.user.id;
      const uniqueId = req.params.id;

      if (!uniqueId) {
        return ApiResponse.error(res, 'Team member ID is required', 400);
      }

      const result = await TeamMemberService.updateTeamMember(userId, uniqueId, value);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message, 404);
      }
    } catch (error: any) {
      console.error('Update Team Member Error:', error);
      return ApiResponse.error(res, error.message || 'Failed to update team member');
    }
  }

  /**
   * Upload team member profile image
   * POST /api/v1/profile/company/team-members/:id/profile-image
   */
  static async uploadProfileImage(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const uniqueId = req.params.id;

      if (!uniqueId) {
        return ApiResponse.error(res, 'Team member ID is required', 400);
      }

      if (!req.file) {
        return ApiResponse.error(res, 'No file uploaded', 400);
      }

      const result = await TeamMemberService.uploadProfileImage(userId, uniqueId, req.file);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message, 404);
      }
    } catch (error: any) {
      console.error('Upload Profile Image Error:', error);
      return ApiResponse.error(res, error.message || 'Failed to upload profile image');
    }
  }

  /**
   * Delete a team member
   * DELETE /api/v1/profile/company/team-members/:id
   */
  static async deleteTeamMember(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const uniqueId = req.params.id;

      if (!uniqueId) {
        return ApiResponse.error(res, 'Team member ID is required', 400);
      }

      const result = await TeamMemberService.deleteTeamMember(userId, uniqueId);

      if (result.success) {
        return ApiResponse.success(res, null, result.message);
      } else {
        return ApiResponse.error(res, result.message, 404);
      }
    } catch (error: any) {
      console.error('Delete Team Member Error:', error);
      return ApiResponse.error(res, error.message || 'Failed to delete team member');
    }
  }
}
