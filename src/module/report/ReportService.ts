import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { ServiceResponse } from "@utils/ApiResponse";

export class ReportService {

  static async createReport(
    reporterId: number,
    reportedUserUniqueId: string,
    reason: string,
    description?: string
  ): Promise<ServiceResponse> {
    try {
      const reportedUser = await prisma.user.findUnique({
        where: { unique_id: reportedUserUniqueId },
        select: { id: true }
      });

      if (!reportedUser) {
        return { success: false, message: "User not found" };
      }

      if (reportedUser.id === reporterId) {
        return { success: false, message: "You cannot report your own profile" };
      }

      const existing = await (prisma as any).reportSpam.findFirst({
        where: { reporter_id: reporterId, reported_user_id: reportedUser.id }
      });

      if (existing) {
        return { success: false, message: "You have already reported this profile" };
      }

      await (prisma as any).reportSpam.create({
        data: {
          reporter_id: reporterId,
          reported_user_id: reportedUser.id,
          reason,
          description: description?.trim() || null,
        }
      });

      return { success: true, message: "Report submitted successfully" };
    } catch (error: any) {
      Log.error("Create report error", { error });
      return { success: false, message: "Failed to submit report" };
    }
  }

  static async checkReport(
    reporterId: number,
    reportedUserUniqueId: string
  ): Promise<ServiceResponse> {
    try {
      const reportedUser = await prisma.user.findUnique({
        where: { unique_id: reportedUserUniqueId },
        select: { id: true }
      });

      if (!reportedUser) {
        return { success: true, message: "OK", data: { hasReported: false } };
      }

      const existing = await (prisma as any).reportSpam.findFirst({
        where: { reporter_id: reporterId, reported_user_id: reportedUser.id }
      });

      return {
        success: true,
        message: "OK",
        data: { hasReported: !!existing }
      };
    } catch (error: any) {
      Log.error("Check report error", { error });
      return { success: true, message: "OK", data: { hasReported: false } };
    }
  }
}
