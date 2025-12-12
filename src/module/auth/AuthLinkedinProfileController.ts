import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { prisma } from '../../services/prismaService';
import axios from 'axios';

interface LinkedInProfileData {
  id: string;
  firstName: {
    localized: { [key: string]: string };
  };
  lastName: {
    localized: { [key: string]: string };
  };
  headline?: string;
  summary?: string;
  profilePicture?: {
    displayImage: string;
  };
  positions?: {
    elements: Array<{
      title: string;
      companyName: string;
      description?: string;
      startDate?: {
        month?: number;
        year?: number;
      };
      endDate?: {
        month?: number;
        year?: number;
      };
      isCurrent?: boolean;
    }>;
  };
}

interface LinkedInEducationData {
  elements: Array<{
    schoolName: string;
    degreeName?: string;
    fieldOfStudy?: string;
    startDate?: {
      month?: number;
      year?: number;
    };
    endDate?: {
      month?: number;
      year?: number;
    };
  }>;
}

interface LinkedInSkillsData {
  elements: Array<{
    name: string;
  }>;
}

/**
 * Import LinkedIn profile data for onboarding
 */
const importLinkedInProfile = async (req: Request, res: Response) => {
  try {
    const { access_token, code, redirectUri } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, "User authentication required");
    }

    let finalAccessToken = access_token;

    // If we have a code instead of access_token, exchange it
    if (code && !access_token) {
      console.log("🔄 Exchanging LinkedIn authorization code for access token");
      
      const tokenParams = {
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      };

      try {
        const tokenResponse = await axios.post(
          "https://www.linkedin.com/oauth/v2/accessToken",
          new URLSearchParams(tokenParams),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
        finalAccessToken = tokenResponse.data.access_token;
        console.log("✅ Access token obtained from code exchange");
      } catch (tokenError: any) {
        console.error("❌ Token exchange failed:", tokenError.response?.data);
        return ApiResponse.error(res, "Failed to exchange LinkedIn authorization code");
      }
    }

    if (!finalAccessToken) {
      return ApiResponse.error(res, "LinkedIn access token or authorization code is required");
    }

    console.log("🔄 Importing LinkedIn profile data for user:", userId);

    // Fetch basic profile information (only what's available with basic scopes)
    let profileData: any = {};
    let experienceData: any[] = [];
    let educationData: any[] = [];
    let skillsData: any[] = [];

    try {
      // Try basic profile first (most likely to work)
      const profileResponse = await axios.get(
        'https://api.linkedin.com/v2/people/~',
        {
          headers: {
            Authorization: `Bearer ${finalAccessToken}`,
          },
        }
      );
      profileData = profileResponse.data;
      console.log("✅ LinkedIn basic profile data fetched");
    } catch (error: any) {
      console.log("⚠️ Could not fetch basic LinkedIn profile:", error.response?.data);
    }

    // Try to get email (separate endpoint)
    try {
      const emailResponse = await axios.get(
        'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
        {
          headers: {
            Authorization: `Bearer ${finalAccessToken}`,
          },
        }
      );
      if (emailResponse.data?.elements?.[0]?.['handle~']?.emailAddress) {
        profileData.email = emailResponse.data.elements[0]['handle~'].emailAddress;
        console.log("✅ LinkedIn email fetched");
      }
    } catch (error: any) {
      console.log("⚠️ Could not fetch LinkedIn email:", error.response?.data);
    }

    // Note: Experience, Education, and Skills are no longer available for most apps
    console.log("ℹ️ LinkedIn API restrictions: Experience, Education, and Skills data not available for third-party apps");

    // Extract names
    const firstName = Object.values(profileData.firstName?.localized || {})[0] as string || '';
    const lastName = Object.values(profileData.lastName?.localized || {})[0] as string || '';

    // Update user basic info
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        first_name: firstName,
        last_name: lastName,
        profileImage: profileData.profilePicture?.displayImage,
        linkedinId: profileData.id,
      },
    });

    // Update or create personal info
    const personalInfoData = {
      title: profileData.headline || '',
      about: profileData.summary || '',
    };

    await prisma.personalInfo.upsert({
      where: { user_id: userId },
      update: personalInfoData,
      create: {
        user_id: userId,
        ...personalInfoData,
      },
    });

    // Import education data
    for (const edu of educationData) {
      try {
        await prisma.education.create({
          data: {
            user_id: userId,
            school: edu.schoolName || '',
            degree: edu.degreeName || '',
            area_of_study: edu.fieldOfStudy || '',
            start_month: edu.startDate?.month?.toString() || '',
            start_year: edu.startDate?.year?.toString() || '',
            end_month: edu.endDate?.month?.toString() || null,
            end_year: edu.endDate?.year?.toString() || null,
            description: `Imported from LinkedIn`,
          },
        });
      } catch (error) {
        console.log("⚠️ Error importing education entry:", error);
      }
    }

    // Import experience data
    for (const exp of experienceData) {
      try {
        await prisma.workExperience.create({
          data: {
            user_id: userId,
            role: exp.title || '',
            company: exp.companyName || '',
            description: exp.description || '',
            start_month: exp.startDate?.month?.toString() || '',
            start_year: exp.startDate?.year?.toString() || '',
            end_month: exp.isCurrent ? null : (exp.endDate?.month?.toString() || null),
            end_year: exp.isCurrent ? null : (exp.endDate?.year?.toString() || null),
            is_current: exp.isCurrent || false,
          },
        });
      } catch (error) {
        console.log("⚠️ Error importing experience entry:", error);
      }
    }

    // Import skills as user expertise
    if (skillsData.length > 0) {
      try {
        // Find or create a general "Technology" expertise category
        let techCategory = await prisma.expertiseCategory.findFirst({
          where: { name: 'Technology' }
        });

        if (!techCategory) {
          techCategory = await prisma.expertiseCategory.create({
            data: { name: 'Technology', description: 'Technology and technical skills' }
          });
        }

        // Find or create a general "General Skills" specialty
        let generalSpecialty = await prisma.specialty.findFirst({
          where: { name: 'General Skills' }
        });

        if (!generalSpecialty) {
          generalSpecialty = await prisma.specialty.create({
            data: { 
              name: 'General Skills', 
              description: 'General professional skills',
              expertise_category_id: techCategory.id
            }
          });
        }

        // Create user expertise with LinkedIn skills
        const skillNames = skillsData.map(skill => skill.name).slice(0, 20); // Limit to 20 skills

        await prisma.userExpertise.create({
          data: {
            user_id: userId,
            expertise_category_id: techCategory.id,
            specialty_id: generalSpecialty.id,
            description: 'Skills imported from LinkedIn profile',
            skills: skillNames,
          },
        });
      } catch (error) {
        console.log("⚠️ Error importing skills:", error);
      }
    }

    console.log("✅ LinkedIn profile import completed successfully");

    return ApiResponse.success(
      res,
      {
        user: {
          id: updatedUser.id,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          profileImage: updatedUser.profileImage,
        },
        imported: {
          basicInfo: firstName || lastName ? true : false,
          email: profileData.email ? true : false,
          education: 0, // Not available with current LinkedIn API
          experience: 0, // Not available with current LinkedIn API  
          skills: 0, // Not available with current LinkedIn API
        },
      },
      "LinkedIn profile imported successfully"
    );

  } catch (error: any) {
    console.error('❌ LinkedIn profile import error:', error);
    
    let errorMessage = "Failed to import LinkedIn profile. ";
    if (error.response?.status === 401) {
      errorMessage += "LinkedIn access token has expired. Please try again.";
    } else if (error.response?.status === 403) {
      errorMessage += "Insufficient LinkedIn permissions. Some data may not be available.";
    } else {
      errorMessage += error.message || "Unknown error occurred.";
    }

    return ApiResponse.error(res, errorMessage);
  }
};

export { importLinkedInProfile };
