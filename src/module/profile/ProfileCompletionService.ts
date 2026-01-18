import { prisma } from '../../services/prismaService';


// Profile completion percentages
export const PROFILE_COMPLETION_WEIGHTS = {
  profilePicture: 3,
  profileCover: 3,
  profileSummary: 12, // title + about combined
  personalInfo: 6,
  skillsExpertise: 16,
  workExperience: 8,
  portfolio: 14,
  hourlyRate: 6,
  education: 4,
  licenseCertifications: 4,
  languages: 2,
  achievements: 2,
  emailVerification: 3,
  phoneVerification: 3,
  identityVerification: 14 // Total verification: 20%
} as const;

/**
 * Calculate profile completion percentage based on user data
 */
export const calculateProfileCompletion = async (
  userId: number
): Promise<{
  totalPercentage: number;
  completedFields: Record<string, boolean>;
  fieldPercentages: Record<string, number>;
}> => {
  try {
    // Fetch user data with all relations
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userProfiles: true,
        education: true,
        licenses: true,
        workExperiences: true,
        achievements: true,
        expertises: true,
        portfolios: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Get first profile (default to freelancer profile)
    const userProfile = user.userProfiles?.[0];

    const completedFields: Record<string, boolean> = {};
    const fieldPercentages = PROFILE_COMPLETION_WEIGHTS;

    // Profile Picture (3%)
    completedFields.profilePicture = !!userProfile?.profileImage;

    // Profile Cover (3%)
    completedFields.profileCover = !!userProfile?.coverImage;

    // Profile Summary (12%) - Title + About
    const hasTitle = !!userProfile?.title;
    const hasAbout = !!userProfile?.about;
    completedFields.profileSummary = hasTitle && hasAbout;

    // Personal Info (6%) - Address, city, country, website
    const hasAddress = !!userProfile?.address;
    const hasCity = !!userProfile?.city;
    const hasCountry = !!userProfile?.country_id;
    const hasWebsite = !!userProfile?.website;
    completedFields.personalInfo = hasAddress && hasCity && hasCountry;

    // Skills/Expertise (16%)
    completedFields.skillsExpertise = (user.expertises?.length || 0) > 0;

    // Work Experience (8%)
    completedFields.workExperience = (user.workExperiences?.length || 0) > 0;

    // Portfolio (14%)
    completedFields.portfolio = (user.portfolios?.length || 0) > 0;

    // Hourly Rate (6%)
    completedFields.hourlyRate = !!userProfile?.hourly_rate;

    // Education (4%)
    completedFields.education = (user.education?.length || 0) > 0;

    // License & Certifications (4%)
    completedFields.licenseCertifications = (user.licenses?.length || 0) > 0;

    // Languages (2%)
    const hasLanguages = !!(
      userProfile?.languages &&
      Array.isArray(userProfile.languages) &&
      (userProfile.languages as any[]).length > 0
    );
    completedFields.languages = hasLanguages;

    // Achievements (2%)
    completedFields.achievements = (user.achievements?.length || 0) > 0;

    // Email Verification (3%)
    completedFields.emailVerification = !!user.email_verified_at;

    // Phone Verification (3%)
    completedFields.phoneVerification = !!user.phone_verified_at;

    // Identity Verification (14%)
    completedFields.identityVerification =
      user.identity_verification_status === "APPROVED" &&
      !!user.identity_verified_at;

    // Calculate total percentage
    let totalPercentage = 0;
    Object.entries(completedFields).forEach(([field, isCompleted]) => {
      if (isCompleted) {
        totalPercentage +=
          fieldPercentages[field as keyof typeof fieldPercentages] || 0;
      }
    });

    return {
      totalPercentage: Math.min(totalPercentage, 100),
      completedFields,
      fieldPercentages,
    };
  } catch (error) {
    console.error("Error calculating profile completion:", error);
    throw error;
  }
};

export default {
  calculateProfileCompletion,
  PROFILE_COMPLETION_WEIGHTS,
};
