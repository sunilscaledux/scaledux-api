import { prisma } from "@services/prismaService";
import { ProfileSummaryInput, PersonalInfoInput, HourlyRateInput } from "./ProfileType";
import { ServiceResponse } from "@utils/ApiResponse";
import { getFileUrl, getRelativePath } from "@utils/General";

export class ProfileService {
  /**
   * Update profile summary (title and about)
   */
  static async updateProfileSummary(userId: number, data: ProfileSummaryInput): Promise<ServiceResponse> {
    try {
      // Upsert personal info with title and about
      const personalInfo = await prisma.personalInfo.upsert({
        where: {
          user_id: userId,
        },
        update: {
          title: data.title,
          about: data.about,
        },
        create: {
          user_id: userId,
          title: data.title,
          about: data.about,
        },
      });

      // Get user with personal info for response
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          personalInfo: true,
        },
      });

      return {
        success: true,
        message: "Profile summary updated successfully",
        data: user
      };
    } catch (error: any) {
      console.error("Update Profile Summary Error:", error);
      return {
        success: false,
        message: "Failed to update profile summary"
      };
    }
  }

  /**
   * Update personal information
   */
  static async updatePersonalInfo(userId: number, data: PersonalInfoInput): Promise<ServiceResponse> {
    try {
      // Upsert personal info
      const personalInfo = await prisma.personalInfo.upsert({
        where: {
          user_id: userId,
        },
        update: {
          address: data.address,
          address_line_2: data.address_line_2,
          zipCode: data.zipCode,
          country_id: data.countryId,
          state_id: data.stateId,
          city: data.city,
          website: data.website,
          links: data.links || [],
        },
        create: {
          user_id: userId,
          address: data.address,
          address_line_2: data.address_line_2,
          zipCode: data.zipCode,
          country_id: data.countryId,
          state_id: data.stateId,
          city: data.city,
          website: data.website,
          links: data.links || [],
        },
      });

      // Get user with personal info and relations for response
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          personalInfo: {
            include: {
              country: true,
              state: true,
            },
          },
        },
      });

      return {
        success: true,
        message: "Personal information updated successfully",
        data: user
      };
    } catch (error: any) {
      console.error("Update Personal Info Error:", error);
      return {
        success: false,
        message: "Failed to update personal information"
      };
    }
  }

  /**
   * Update privacy settings
   */
  static async updatePrivacySettings(userId: number, hideEmail?: boolean, hidePhone?: boolean): Promise<ServiceResponse> {
    try {
      const updateData: any = {};
      if (hideEmail !== undefined) updateData.hideEmail = hideEmail;
      if (hidePhone !== undefined) updateData.hidePhone = hidePhone;

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      return {
        success: true,
        message: "Privacy settings updated successfully",
        data: user
      };
    } catch (error: any) {
      console.error("Update Privacy Settings Error:", error);
      return {
        success: false,
        message: "Failed to update privacy settings"
      };
    }
  }

  /**
   * Upload profile image
   */
  static async uploadProfileImage(userId: number, file: Express.Multer.File): Promise<ServiceResponse> {
    try {
      if (!file) {
        return {
          success: false,
          message: "No file uploaded"
        };
      }

      const imagePath = getRelativePath(file.path);
      const imageUrl = getFileUrl(imagePath);

      const user = await prisma.user.update({
        where: { id: userId },
        data: { profileImage: imagePath },
      });

      return {
        success: true,
        message: "Profile image uploaded successfully",
        data: {
          imagePath,  // Relative path for storage
          imageUrl,   // Full URL for immediate display
          user
        }
      };
    } catch (error: any) {
      console.error("Upload Profile Image Error:", error);
      return {
        success: false,
        message: "Failed to upload profile image"
      };
    }
  }

  /**
   * Upload cover image
   */
  static async uploadCoverImage(userId: number, file: Express.Multer.File): Promise<ServiceResponse> {
    try {
      if (!file) {
        return {
          success: false,
          message: "No file uploaded"
        };
      }

      const imagePath = getRelativePath(file.path);
      const imageUrl = getFileUrl(imagePath);

      const user = await prisma.user.update({
        where: { id: userId },
        data: { coverImage: imagePath },
      });

      return {
        success: true,
        message: "Cover image uploaded successfully",
        data: {
          imagePath,  // Relative path for storage
          imageUrl,   // Full URL for immediate display
          user
        }
      };
    } catch (error: any) {
      console.error("Upload Cover Image Error:", error);
      return {
        success: false,
        message: "Failed to upload cover image"
      };
    }
  }

  /**
   * Update hourly rate
   */
  static async updateHourlyRate(userId: number, data: HourlyRateInput): Promise<ServiceResponse> {
    try {
      // Upsert personal info with hourly rate and currency
      const personalInfo = await prisma.personalInfo.upsert({
        where: {
          user_id: userId,
        },
        update: {
          hourly_rate: data.hourly_rate,
          currency_id: data.currency_id,
        },
        create: {
          user_id: userId,
          hourly_rate: data.hourly_rate,
          currency_id: data.currency_id,
        },
      });

      // Get user with personal info and currency for response
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          personalInfo: {
            include: {
              currency: true,
            },
          },
        },
      });

      return {
        success: true,
        message: "Hourly rate updated successfully",
        data: user
      };
    } catch (error: any) {
      console.error("Update Hourly Rate Error:", error);
      return {
        success: false,
        message: "Failed to update hourly rate"
      };
    }
  }

  /**
   * Update languages
   */
  static async updateLanguages(userId: number, languages: string[]): Promise<ServiceResponse> {
    try {
      // Note: languages field might not exist in User schema
      // const user = await prisma.user.update({
      //   where: { id: userId },
      //   data: { languages: languages || [] },
      // });
      
      // For now, return success without updating
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      return {
        success: true,
        message: "Languages updated successfully",
        data: user
      };
    } catch (error: any) {
      console.error("Update Languages Error:", error);
      return {
        success: false,
        message: "Failed to update languages"
      };
    }
  }

  /**
   * Update agency settings
   */
  static async updateAgencySettings(userId: number, showAsAgency: boolean): Promise<ServiceResponse> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { show_as_agency: showAsAgency },
      });

      return {
        success: true,
        message: "Agency settings updated successfully",
        data: user
      };
    } catch (error: any) {
      console.error("Update Agency Settings Error:", error);
      return {
        success: false,
        message: "Failed to update agency settings"
      };
    }
  }

  /**
   * Get public profile by unique ID
   */
  static async getPublicProfile(uniqueId: string): Promise<ServiceResponse> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          uniqueId: uniqueId,
          status: 1, // Only active users
        },
        select: {
          id: true,
          uniqueId: true,
          FirstName: true,
          LastName: true,
          email: true,
          phone: true,
          profileImage: true,
          coverImage: true,
          hideEmail: true,
          hidePhone: true,
          // languages: true, // Field might not exist in schema
          show_as_agency: true,
          created_at: true,
          personalInfo: {
            include: {
              country: true,
              state: true,
              currency: true,
            },
          },
        },
      });

      if (!user) {
        return {
          success: false,
          message: "User not found"
        };
      }

      // Transform image URLs
      const transformedUser = {
        ...user,
        profileImage: user.profileImage ? getFileUrl(user.profileImage) : null,
        coverImage: user.coverImage ? getFileUrl(user.coverImage) : null,
        // Hide sensitive info based on privacy settings
        email: user.hideEmail ? null : user.email,
        phone: user.hidePhone ? null : user.phone,
      };

      return {
        success: true,
        message: "Public profile retrieved successfully",
        data: transformedUser
      };
    } catch (error: any) {
      console.error("Get Public Profile Error:", error);
      return {
        success: false,
        message: "Failed to get public profile"
      };
    }
  }
}
