import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";
import { Log } from "@services/loggerService";

const categorySelect = {
  category: { select: { id: true, name: true } as const },
} as const;

/** Convert duration string to minutes */
function parseDuration(val: string): number {
  const map: Record<string, number> = { "15m": 15, "30m": 30, "45m": 45 };
  return map[val] ?? 15;
}

/** Convert minutes back to duration string */
function formatDuration(minutes: number): string {
  return `${minutes}m`;
}

/** Safe parseInt — returns undefined if not a valid number */
function safeInt(val: any): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? undefined : n;
}

/** Safe parseFloat — returns undefined if not a valid number */
function safeFloat(val: any): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const n = parseFloat(String(val));
  return isNaN(n) ? undefined : n;
}

/** Transform UI form data → Prisma create/update data */
function transformInput(data: any) {
  const result: any = {};

  if (data.packageTitle !== undefined) result.title = data.packageTitle;
  if (data.packageDescription !== undefined) result.description = data.packageDescription;

  if (data.sessionDetails) {
    if (data.sessionDetails.sessionDuration)
      result.session_duration = parseDuration(data.sessionDetails.sessionDuration);
    const sessions = safeInt(data.sessionDetails.noOfSessions);
    if (sessions !== undefined) result.no_of_sessions = sessions;
    if (data.sessionDetails.sessionPrice) {
      const amount = safeFloat(data.sessionDetails.sessionPrice.amount);
      if (amount !== undefined) result.session_price_amount = amount;
      if (data.sessionDetails.sessionPrice.currency)
        result.session_price_currency = data.sessionDetails.sessionPrice.currency;
    }
  }

  if (data.sessionRecording) {
    result.recording_enabled = data.sessionRecording.isRecordingEnabled ?? false;
    result.recording_type = data.sessionRecording.recordingType || null;
    if (data.sessionRecording.recordingPrice) {
      result.recording_price_amount = safeFloat(data.sessionRecording.recordingPrice.amount) ?? null;
      result.recording_price_currency = data.sessionRecording.recordingPrice.currency || null;
    }
  }

  if (data.expertise) {
    const catId = safeInt(data.expertise.yourExpertise);
    if (catId !== undefined) result.category_id = catId;
    if (data.expertise.topics !== undefined)
      result.topics = data.expertise.topics;
    if (data.expertise.expectedOutcomes !== undefined)
      result.expected_outcomes = (data.expertise.expectedOutcomes || []).map((o: any) => o.value).filter(Boolean);
    if (data.expertise.menteesExpections !== undefined)
      result.mentees_expectations = (data.expertise.menteesExpections || []).map((o: any) => o.value).filter(Boolean);
  }

  if (data.terms !== undefined) result.terms_and_conditions = data.terms || null;
  if (data.status !== undefined) result.status = data.status;

  return result;
}

/** Transform DB row → API response matching UI form shape */
function transformOutput(pkg: any) {
  const { category, user, ...row } = pkg;
  return {
    id: row.id,
    uniqueId: row.unique_id,
    packageTitle: row.title,
    packageDescription: row.description || "",
    sessionDetails: {
      sessionDuration: row.session_duration ? formatDuration(row.session_duration) : "",
      noOfSessions: row.no_of_sessions != null ? String(row.no_of_sessions) : "",
      sessionPrice: {
        currency: row.session_price_currency === "INR" ? "₹" : (row.session_price_currency || "₹"),
        amount: row.session_price_amount != null ? String(row.session_price_amount) : "",
      },
    },
    sessionRecording: {
      isRecordingEnabled: row.recording_enabled,
      recordingType: row.recording_type || "",
      recordingPrice: {
        currency: row.recording_price_currency === "INR" ? "₹" : (row.recording_price_currency || ""),
        amount: row.recording_price_amount != null ? String(row.recording_price_amount) : "",
      },
    },
    expertise: {
      yourExpertise: row.category_id ? String(row.category_id) : "",
      topics: typeof row.topics === "string" ? JSON.parse(row.topics) : (row.topics || []),
      expectedOutcomes: (
        typeof row.expected_outcomes === "string"
          ? JSON.parse(row.expected_outcomes)
          : (row.expected_outcomes || [])
      ).map((v: string) => ({ value: v })),
      menteesExpections: (
        typeof row.mentees_expectations === "string"
          ? JSON.parse(row.mentees_expectations)
          : (row.mentees_expectations || [])
      ).map((v: string) => ({ value: v })),
    },
    terms: row.terms_and_conditions || "",
    status: row.status,
    category: category ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(user
      ? {
          user: {
            id: user.id,
            uniqueId: user.unique_id,
            firstName: user.first_name,
            lastName: user.last_name,
            profileImage: user.personalInfo?.profileImage || null,
          },
        }
      : {}),
  };
}

export class MentorPackageService {
  /**
   * Create a new mentor package
   */
  static async createMentorPackage(userId: number, data: any): Promise<ServiceResponse> {
    try {
      const dbData = transformInput(data);
      const newPackage = await prisma.mentorPackage.create({
        data: { user_id: userId, ...dbData },
        include: categorySelect,
      });

      return {
        success: true,
        message: "Mentor package created successfully",
        data: transformOutput(newPackage),
      };
    } catch (error: any) {
      Log.error("Error creating mentor package", { error });
      return { success: false, message: "Failed to create mentor package" };
    }
  }

  /**
   * Get all mentor packages for authenticated user
   */
  static async getUserMentorPackages(userId: number, status?: string): Promise<ServiceResponse> {
    try {
      const where: any = { user_id: userId };
      if (status) where.status = status;

      const packages = await prisma.mentorPackage.findMany({
        where,
        orderBy: { created_at: "desc" },
        include: {
          ...categorySelect,
          user: {
            select: {
              id: true,
              unique_id: true,
              first_name: true,
              last_name: true,
              personalInfo: { select: { profileImage: true } },
            },
          },
        },
      });

      return {
        success: true,
        message: "Mentor packages retrieved successfully",
        data: packages.map(transformOutput),
      };
    } catch (error: any) {
      Log.error("Error retrieving mentor packages", { error });
      return { success: false, message: "Failed to retrieve mentor packages" };
    }
  }

  /**
   * Get mentor package by unique_id (owner only)
   */
  static async getMentorPackageById(userId: number, uniqueId: string): Promise<ServiceResponse> {
    try {
      const pkg = await prisma.mentorPackage.findFirst({
        where: { unique_id: uniqueId, user_id: userId },
        include: categorySelect,
      });

      if (!pkg) {
        return { success: false, message: "Mentor package not found" };
      }

      return {
        success: true,
        message: "Mentor package retrieved successfully",
        data: transformOutput(pkg),
      };
    } catch (error: any) {
      Log.error("Error retrieving mentor package", { error });
      return { success: false, message: "Failed to retrieve mentor package" };
    }
  }

  /**
   * Update mentor package (owner only)
   */
  static async updateMentorPackage(userId: number, uniqueId: string, data: any): Promise<ServiceResponse> {
    try {
      const existing = await prisma.mentorPackage.findFirst({
        where: { unique_id: uniqueId, user_id: userId },
      });

      if (!existing) {
        return { success: false, message: "Mentor package not found" };
      }

      const dbData = transformInput(data);
      const updated = await prisma.mentorPackage.update({
        where: { id: existing.id },
        data: dbData,
        include: categorySelect,
      });

      return {
        success: true,
        message: "Mentor package updated successfully",
        data: transformOutput(updated),
      };
    } catch (error: any) {
      Log.error("Error updating mentor package", { error });
      return { success: false, message: "Failed to update mentor package" };
    }
  }

  /**
   * Delete mentor package (owner only)
   */
  static async deleteMentorPackage(userId: number, uniqueId: string): Promise<ServiceResponse> {
    try {
      const existing = await prisma.mentorPackage.findFirst({
        where: { unique_id: uniqueId, user_id: userId },
      });

      if (!existing) {
        return { success: false, message: "Mentor package not found" };
      }

      await prisma.mentorPackage.delete({ where: { id: existing.id } });

      return {
        success: true,
        message: "Mentor package deleted successfully",
        data: null,
      };
    } catch (error: any) {
      Log.error("Error deleting mentor package", { error });
      return { success: false, message: "Failed to delete mentor package" };
    }
  }

  /**
   * Duplicate mentor package (owner only)
   */
  static async duplicateMentorPackage(userId: number, uniqueId: string): Promise<ServiceResponse> {
    try {
      const existing = await prisma.mentorPackage.findFirst({
        where: { unique_id: uniqueId, user_id: userId },
      });

      if (!existing) {
        return { success: false, message: "Mentor package not found" };
      }

      const { id, unique_id, created_at, updated_at, ...data } = existing as any;

      const duplicate = await prisma.mentorPackage.create({
        data: {
          ...data,
          title: `${data.title} (Copy)`,
          status: "DRAFT",
        },
        include: categorySelect,
      });

      return {
        success: true,
        message: "Mentor package duplicated successfully",
        data: transformOutput(duplicate),
      };
    } catch (error: any) {
      Log.error("Error duplicating mentor package", { error });
      return { success: false, message: "Failed to duplicate mentor package" };
    }
  }

  /**
   * Get all PUBLISHED mentor packages for a user (public)
   */
  static async getPublicUserMentorPackages(userUniqueId: string): Promise<ServiceResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { unique_id: userUniqueId },
        select: { id: true },
      });

      if (!user) {
        return { success: false, message: "User not found" };
      }

      return MentorPackageService.getUserMentorPackages(user.id, "PUBLISHED");
    } catch (error: any) {
      Log.error("Error retrieving public mentor packages", { error });
      return { success: false, message: "Failed to retrieve mentor packages" };
    }
  }

  /**
   * Get single PUBLISHED mentor package (public)
   */
  static async getPublicMentorPackage(uniqueId: string): Promise<ServiceResponse> {
    try {
      const pkg = await prisma.mentorPackage.findFirst({
        where: { unique_id: uniqueId, status: "PUBLISHED" },
        include: {
          ...categorySelect,
          user: {
            select: {
              id: true,
              unique_id: true,
              first_name: true,
              last_name: true,
              personalInfo: { select: { profileImage: true } },
            },
          },
        },
      });

      if (!pkg) {
        return { success: false, message: "Mentor package not found" };
      }

      return {
        success: true,
        message: "Mentor package retrieved successfully",
        data: transformOutput(pkg),
      };
    } catch (error: any) {
      Log.error("Error retrieving public mentor package", { error });
      return { success: false, message: "Failed to retrieve mentor package" };
    }
  }
}
