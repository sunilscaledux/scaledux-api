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

  /**
   * List reports submitted by a user.
   */
  static async getMyReports(reporterId: number): Promise<ServiceResponse> {
    try {
      const { resolveAttachmentUrl } = await import('@services/attachmentService');
      const { getDisplayName } = await import('@utils/General');

      const reports = await (prisma as any).reportSpam.findMany({
        where: { reporter_id: reporterId },
        include: {
          reported_user: {
            select: {
              id: true, unique_id: true, first_name: true, last_name: true, role: true,
              personalInfo: { select: { profileImage: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      const data = await Promise.all(
        reports.map(async (r: any) => {
          const { firstName, lastName } = getDisplayName(
            { first_name: r.reported_user.first_name, last_name: r.reported_user.last_name },
            { maskLastName: true }
          );
          return {
            id: r.id,
            uniqueId: r.unique_id,
            reportedUser: {
              uniqueId: r.reported_user.unique_id,
              firstName,
              lastName,
              role: r.reported_user.role,
              profileImage: r.reported_user.personalInfo?.profileImage
                ? await resolveAttachmentUrl(r.reported_user.personalInfo.profileImage, 'profile_image')
                : null,
            },
            reason: r.reason,
            description: r.description,
            status: r.status,
            createdAt: r.created_at,
          };
        })
      );

      return { success: true, message: 'OK', data: { reports: data, total: data.length } };
    } catch (error: any) {
      Log.error('Get my reports error', { error });
      return { success: false, message: 'Failed to get reports' };
    }
  }

  /**
   * List all reports (admin).
   */
  static async getAllReports(opts: { limit?: number; offset?: number; status?: string } = {}): Promise<ServiceResponse> {
    try {
      const { resolveAttachmentUrl } = await import('@services/attachmentService');
      const { getDisplayName } = await import('@utils/General');
      const limit = Math.min(opts.limit ?? 50, 100);
      const offset = opts.offset ?? 0;

      const where: any = {};
      if (opts.status) where.status = opts.status;

      const [reports, total] = await Promise.all([
        (prisma as any).reportSpam.findMany({
          where,
          include: {
            reporter: {
              select: { id: true, unique_id: true, first_name: true, last_name: true, role: true },
            },
            reported_user: {
              select: {
                id: true, unique_id: true, first_name: true, last_name: true, role: true,
                personalInfo: { select: { profileImage: true } },
              },
            },
          },
          orderBy: { created_at: 'desc' },
          take: limit,
          skip: offset,
        }),
        (prisma as any).reportSpam.count({ where }),
      ]);

      const data = await Promise.all(
        reports.map(async (r: any) => {
          const reporterName = getDisplayName({ first_name: r.reporter.first_name, last_name: r.reporter.last_name }, { maskLastName: false });
          const reportedName = getDisplayName({ first_name: r.reported_user.first_name, last_name: r.reported_user.last_name }, { maskLastName: false });
          return {
            id: r.id,
            uniqueId: r.unique_id,
            reporter: {
              uniqueId: r.reporter.unique_id,
              firstName: reporterName.firstName,
              lastName: reporterName.lastName,
              role: r.reporter.role,
            },
            reportedUser: {
              uniqueId: r.reported_user.unique_id,
              firstName: reportedName.firstName,
              lastName: reportedName.lastName,
              role: r.reported_user.role,
              profileImage: r.reported_user.personalInfo?.profileImage
                ? await resolveAttachmentUrl(r.reported_user.personalInfo.profileImage, 'profile_image')
                : null,
            },
            reason: r.reason,
            description: r.description,
            status: r.status,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          };
        })
      );

      return { success: true, message: 'OK', data: { reports: data, total } };
    } catch (error: any) {
      Log.error('Get all reports error', { error });
      return { success: false, message: 'Failed to get reports' };
    }
  }

  /**
   * Update report status (admin).
   */
  static async updateReportStatus(reportId: number, status: string): Promise<ServiceResponse> {
    try {
      const validStatuses = ['PENDING', 'REVIEWING', 'RESOLVED', 'CLOSED'];
      if (!validStatuses.includes(status)) {
        return { success: false, message: `Status must be one of: ${validStatuses.join(', ')}` };
      }

      const report = await (prisma as any).reportSpam.findUnique({ where: { id: reportId } });
      if (!report) return { success: false, message: 'Report not found' };

      await (prisma as any).reportSpam.update({
        where: { id: reportId },
        data: { status },
      });

      return { success: true, message: `Report status updated to ${status}` };
    } catch (error: any) {
      Log.error('Update report status error', { error });
      return { success: false, message: 'Failed to update report status' };
    }
  }

  /**
   * Delete a pending report (only reporter can delete).
   */
  static async deleteReport(reporterId: number, reportId: number): Promise<ServiceResponse> {
    try {
      const report = await (prisma as any).reportSpam.findUnique({ where: { id: reportId } });
      if (!report) return { success: false, message: 'Report not found' };
      if (report.reporter_id !== reporterId) return { success: false, message: 'Not authorized' };
      if (report.status !== 'PENDING') return { success: false, message: 'Only pending reports can be deleted' };

      await (prisma as any).reportSpam.delete({ where: { id: reportId } });
      return { success: true, message: 'Report deleted' };
    } catch (error: any) {
      Log.error('Delete report error', { error });
      return { success: false, message: 'Failed to delete report' };
    }
  }

  /**
   * Update a pending report (only reporter can edit).
   */
  static async updateReport(reporterId: number, reportId: number, reason: string, description?: string): Promise<ServiceResponse> {
    try {
      const report = await (prisma as any).reportSpam.findUnique({ where: { id: reportId } });
      if (!report) return { success: false, message: 'Report not found' };
      if (report.reporter_id !== reporterId) return { success: false, message: 'Not authorized' };
      if (report.status !== 'PENDING') return { success: false, message: 'Only pending reports can be edited' };

      await (prisma as any).reportSpam.update({
        where: { id: reportId },
        data: { reason, description: description?.trim() || null },
      });
      return { success: true, message: 'Report updated' };
    } catch (error: any) {
      Log.error('Update report error', { error });
      return { success: false, message: 'Failed to update report' };
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
