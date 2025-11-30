import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

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
    const { access_token } = req.body;
    const userId = req.user?.id;

    if (!access_token) {
      return ApiResponse.error(res, "LinkedIn access token is required");
    }

    if (!userId) {
      return ApiResponse.error(res, "User authentication required");
    }

    console.log("🔄 Importing LinkedIn profile data for user:", userId);

    // Fetch basic profile information
    const profileResponse = await axios.get<LinkedInProfileData>(
      'https://api.linkedin.com/v2/people/~:(id,firstName,lastName,headline,summary,profilePicture(displayImage~:playableStreams))',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const profileData = profileResponse.data;
    console.log("✅ LinkedIn profile data fetched");

    // Fetch positions/experience
    let experienceData: any[] = [];
    try {
      const positionsResponse = await axios.get(
        'https://api.linkedin.com/v2/positions?q=members&members=~&projection=(elements*(title,companyName,description,startDate,endDate,isCurrent))',
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );
      experienceData = positionsResponse.data.elements || [];
      console.log("✅ LinkedIn experience data fetched:", experienceData.length, "positions");
    } catch (error) {
      console.log("⚠️ Could not fetch LinkedIn positions (may require additional permissions)");
    }

    // Fetch education
    let educationData: any[] = [];
    try {
      const educationResponse = await axios.get<LinkedInEducationData>(
        'https://api.linkedin.com/v2/educations?q=members&members=~&projection=(elements*(schoolName,degreeName,fieldOfStudy,startDate,endDate))',
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );
      educationData = educationResponse.data.elements || [];
      console.log("✅ LinkedIn education data fetched:", educationData.length, "entries");
    } catch (error) {
      console.log("⚠️ Could not fetch LinkedIn education (may require additional permissions)");
    }

    // Fetch skills
    let skillsData: any[] = [];
    try {
      const skillsResponse = await axios.get<LinkedInSkillsData>(
        'https://api.linkedin.com/v2/skills?q=members&members=~&projection=(elements*(name))',
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );
      skillsData = skillsResponse.data.elements || [];
      console.log("✅ LinkedIn skills data fetched:", skillsData.length, "skills");
    } catch (error) {
      console.log("⚠️ Could not fetch LinkedIn skills (may require additional permissions)");
    }

    // Extract names
    const firstName = Object.values(profileData.firstName?.localized || {})[0] as string || '';
    const lastName = Object.values(profileData.lastName?.localized || {})[0] as string || '';

    // Update user basic info
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        FirstName: firstName,
        LastName: lastName,
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
          firstName: updatedUser.FirstName,
          lastName: updatedUser.LastName,
          profileImage: updatedUser.profileImage,
        },
        imported: {
          basicInfo: true,
          education: educationData.length,
          experience: experienceData.length,
          skills: skillsData.length,
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
