import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";
import { getFileUrl } from "@utils/General";

/**
 * ProfileService - Legacy service for public profile access
 * For profile management, use FreelancerProfileService or CompanyProfileService
 */
export class ProfileService {
  
  /**
   * Get public profile by unique ID
   */
  static async getPublicProfile(uniqueId: string): Promise<ServiceResponse> {
    try {
      // Try to find user by freelancer or company profile unique_id
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { freelancerProfile: { unique_id: uniqueId } },
            { companyProfile: { unique_id: uniqueId } }
          ],
          status: 1, // Only active users
        },
        include: {
          freelancerProfile: {
            include: {
              country: true,
              state: true,
            }
          },
          companyProfile: {
            include: {
              country: true,
              state: true,
            }
          },
        },
      });

      if (!user) {
        return {
          success: false,
          message: "User not found"
        };
      }

      const userProfile = user.freelancerProfile || user.companyProfile;

      // Transform image URLs
      const transformedUser = {
        ...user,
        profileImage: userProfile?.profileImage ? getFileUrl(userProfile.profileImage) : null,
        coverImage: userProfile?.coverImage ? getFileUrl(userProfile.coverImage) : null,
        // Hide sensitive info based on privacy settings
        email: userProfile?.hideEmail ? null : user.email,
        phone: userProfile?.hidePhone ? null : user.phone,
      };

      return {
        success: true,
        message: "User profile retrieved successfully",
        data: transformedUser
      };
    } catch (error: any) {
      console.error("Get Public Profile Error:", error);
      return {
        success: false,
        message: "Failed to retrieve user profile"
      };
    }
  }
}
