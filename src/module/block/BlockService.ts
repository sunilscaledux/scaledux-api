import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { Log } from '@services/loggerService';

export class BlockService {
  static async blockUser(blockerId: number, blockedUniqueId: string): Promise<ServiceResponse> {
    try {
      const blockedUser = await prisma.user.findUnique({
        where: { unique_id: blockedUniqueId },
        select: { id: true },
      });
      if (!blockedUser) return { success: false, message: 'User not found' };
      if (blockedUser.id === blockerId) return { success: false, message: 'Cannot block yourself' };

      const existing = await (prisma as any).blockedUser.findFirst({
        where: { blocker_id: blockerId, blocked_user_id: blockedUser.id },
      });
      if (existing) return { success: false, message: 'User is already blocked' };

      await (prisma as any).blockedUser.create({
        data: { blocker_id: blockerId, blocked_user_id: blockedUser.id },
      });

      // Also disconnect if connected
      await (prisma as any).connection.updateMany({
        where: {
          status: 'CONNECTED',
          OR: [
            { sender_id: blockerId, receiver_id: blockedUser.id },
            { sender_id: blockedUser.id, receiver_id: blockerId },
          ],
        },
        data: { status: 'DISCONNECTED' },
      });

      return { success: true, message: 'User blocked' };
    } catch (error: any) {
      Log.error('Block user error', { error });
      return { success: false, message: error.message || 'Failed to block user' };
    }
  }

  static async unblockUser(blockerId: number, blockedUniqueId: string): Promise<ServiceResponse> {
    try {
      const blockedUser = await prisma.user.findUnique({
        where: { unique_id: blockedUniqueId },
        select: { id: true },
      });
      if (!blockedUser) return { success: false, message: 'User not found' };

      const existing = await (prisma as any).blockedUser.findFirst({
        where: { blocker_id: blockerId, blocked_user_id: blockedUser.id },
      });
      if (!existing) return { success: false, message: 'User is not blocked' };

      await (prisma as any).blockedUser.delete({ where: { id: existing.id } });

      return { success: true, message: 'User unblocked' };
    } catch (error: any) {
      Log.error('Unblock user error', { error });
      return { success: false, message: error.message || 'Failed to unblock user' };
    }
  }

  static async getBlockedUsers(blockerId: number): Promise<ServiceResponse> {
    try {
      const { resolveAttachmentUrl } = await import('@services/attachmentService');
      const { getDisplayName } = await import('@utils/General');

      const blocked = await (prisma as any).blockedUser.findMany({
        where: { blocker_id: blockerId },
        include: {
          blocked_user: {
            select: {
              id: true, unique_id: true, first_name: true, last_name: true, role: true,
              personalInfo: { select: { profileImage: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      const data = await Promise.all(
        blocked.map(async (b: any) => {
          const { firstName, lastName } = getDisplayName(
            { first_name: b.blocked_user.first_name, last_name: b.blocked_user.last_name },
            { maskLastName: true }
          );
          return {
            id: b.id,
            blockedAt: b.created_at,
            user: {
              uniqueId: b.blocked_user.unique_id,
              firstName,
              lastName,
              role: b.blocked_user.role,
              profileImage: b.blocked_user.personalInfo?.profileImage
                ? await resolveAttachmentUrl(b.blocked_user.personalInfo.profileImage, 'profile_image')
                : null,
            },
          };
        })
      );

      return { success: true, message: 'OK', data: { blockedUsers: data, total: data.length } };
    } catch (error: any) {
      Log.error('Get blocked users error', { error });
      return { success: false, message: 'Failed to get blocked users' };
    }
  }

  static async isBlocked(userId: number, otherUserId: number): Promise<boolean> {
    const block = await (prisma as any).blockedUser.findFirst({
      where: {
        OR: [
          { blocker_id: userId, blocked_user_id: otherUserId },
          { blocker_id: otherUserId, blocked_user_id: userId },
        ],
      },
    });
    return !!block;
  }
}
