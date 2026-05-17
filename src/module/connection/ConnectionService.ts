import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { Log } from '@services/loggerService';
import { ConversationService } from '@module/chat/ConversationService';

export class ConnectionService {
  /**
   * Send a connection request with an optional note.
   * Creates the Connection row and syncs the note as the first chat message.
   */
  static async sendRequest(senderId: number, receiverUniqueId: string, note?: string): Promise<ServiceResponse> {
    try {
      if (!receiverUniqueId) {
        return { success: false, message: 'Receiver unique ID is required' };
      }

      const receiver = await prisma.user.findUnique({
        where: { unique_id: receiverUniqueId },
        select: { id: true, unique_id: true },
      });

      if (!receiver) {
        return { success: false, message: 'User not found' };
      }

      if (receiver.id === senderId) {
        return { success: false, message: 'Cannot connect with yourself' };
      }

      // Check if connection already exists in either direction
      const existing = await (prisma as any).connection.findFirst({
        where: {
          OR: [
            { sender_id: senderId, receiver_id: receiver.id },
            { sender_id: receiver.id, receiver_id: senderId },
          ],
        },
      });

      if (existing) {
        if (existing.status === 'CONNECTED') {
          return { success: false, message: 'Already connected' };
        }
        if (existing.status === 'REQUESTED') {
          // If the other user already sent a request to us, auto-accept
          if (existing.sender_id === receiver.id) {
            await (prisma as any).connection.update({
              where: { id: existing.id },
              data: { status: 'CONNECTED' },
            });
            // Accept the conversation too
            await this.acceptConversation(senderId, receiver.id);
            return { success: true, message: 'Connection accepted' };
          }
          return { success: false, message: 'Connection request already sent' };
        }
        if (existing.status === 'REJECTED' || existing.status === 'WITHDRAWN') {
          // Allow re-request by updating existing record
          await (prisma as any).connection.update({
            where: { id: existing.id },
            data: { sender_id: senderId, receiver_id: receiver.id, status: 'REQUESTED', note: note || null },
          });
        }
      } else {
        await (prisma as any).connection.create({
          data: {
            sender_id: senderId,
            receiver_id: receiver.id,
            status: 'REQUESTED',
            note: note || null,
          },
        });
      }

      // Create conversation with NOT_ACCEPTED status and send the note as first message
      if (note) {
        const convoResult = await ConversationService.getOrCreateConversation(senderId, receiver.id);
        if (convoResult.success && convoResult.data) {
          await (prisma as any).message.create({
            data: {
              conversation_id: convoResult.data.id,
              sender_id: senderId,
              content: note,
              type: 'SYSTEM',
              metadata: { activityType: 'connection_request' },
            },
          });
        }
      }

      return { success: true, message: 'Connection request sent' };
    } catch (error: any) {
      Log.error('Send connection request error', { error });
      return { success: false, message: error.message || 'Failed to send connection request' };
    }
  }

  /**
   * Accept a connection request.
   */
  static async acceptRequest(receiverId: number, connectionId: number): Promise<ServiceResponse> {
    try {
      const connection = await (prisma as any).connection.findUnique({
        where: { id: connectionId },
      });

      if (!connection) {
        return { success: false, message: 'Connection request not found' };
      }

      if (connection.receiver_id !== receiverId) {
        return { success: false, message: 'Not authorized to accept this request' };
      }

      if (connection.status !== 'REQUESTED') {
        return { success: false, message: `Cannot accept a ${connection.status.toLowerCase()} connection` };
      }

      await (prisma as any).connection.update({
        where: { id: connectionId },
        data: { status: 'CONNECTED' },
      });

      // Set conversation status to ACCEPTED so they can chat freely
      await this.acceptConversation(connection.sender_id, connection.receiver_id);

      return { success: true, message: 'Connection accepted' };
    } catch (error: any) {
      Log.error('Accept connection error', { error });
      return { success: false, message: error.message || 'Failed to accept connection' };
    }
  }

  /**
   * Reject a connection request.
   */
  static async rejectRequest(receiverId: number, connectionId: number): Promise<ServiceResponse> {
    try {
      const connection = await (prisma as any).connection.findUnique({
        where: { id: connectionId },
      });

      if (!connection) {
        return { success: false, message: 'Connection request not found' };
      }

      if (connection.receiver_id !== receiverId) {
        return { success: false, message: 'Not authorized to reject this request' };
      }

      if (connection.status !== 'REQUESTED') {
        return { success: false, message: `Cannot reject a ${connection.status.toLowerCase()} connection` };
      }

      await (prisma as any).connection.update({
        where: { id: connectionId },
        data: { status: 'REJECTED' },
      });

      return { success: true, message: 'Connection rejected' };
    } catch (error: any) {
      Log.error('Reject connection error', { error });
      return { success: false, message: error.message || 'Failed to reject connection' };
    }
  }

  /**
   * Withdraw a sent connection request.
   */
  static async withdrawRequest(senderId: number, connectionId: number): Promise<ServiceResponse> {
    try {
      const connection = await (prisma as any).connection.findUnique({
        where: { id: connectionId },
      });

      if (!connection) {
        return { success: false, message: 'Connection request not found' };
      }

      if (connection.sender_id !== senderId) {
        return { success: false, message: 'Not authorized to withdraw this request' };
      }

      if (connection.status !== 'REQUESTED') {
        return { success: false, message: `Cannot withdraw a ${connection.status.toLowerCase()} connection` };
      }

      await (prisma as any).connection.update({
        where: { id: connectionId },
        data: { status: 'WITHDRAWN' },
      });

      return { success: true, message: 'Connection request withdrawn' };
    } catch (error: any) {
      Log.error('Withdraw connection error', { error });
      return { success: false, message: error.message || 'Failed to withdraw connection request' };
    }
  }

  /**
   * Get connection status between current user and another user.
   */
  static async getConnectionStatus(userId: number, otherUniqueId: string): Promise<ServiceResponse> {
    try {
      const otherUser = await prisma.user.findUnique({
        where: { unique_id: otherUniqueId },
        select: { id: true },
      });

      if (!otherUser) {
        return { success: true, message: 'OK', data: { status: null } };
      }

      const connection = await (prisma as any).connection.findFirst({
        where: {
          OR: [
            { sender_id: userId, receiver_id: otherUser.id },
            { sender_id: otherUser.id, receiver_id: userId },
          ],
        },
        select: { id: true, status: true, sender_id: true },
      });

      if (!connection) {
        return { success: true, message: 'OK', data: { status: null, connectionId: null } };
      }

      return {
        success: true,
        message: 'OK',
        data: {
          connectionId: connection.id,
          status: connection.status,
          isSender: connection.sender_id === userId,
        },
      };
    } catch (error: any) {
      Log.error('Get connection status error', { error });
      return { success: false, message: 'Failed to get connection status' };
    }
  }

  /**
   * List pending connection requests received by user.
   */
  static async getReceivedRequests(userId: number, limit = 20, offset = 0, search?: string, role?: string): Promise<ServiceResponse> {
    try {
      const senderFilter: any = {};
      if (search) {
        senderFilter.OR = [
          { first_name: { contains: search, mode: 'insensitive' } },
          { last_name: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (role) senderFilter.role = role;

      const where: any = { receiver_id: userId, status: 'REQUESTED' };
      if (Object.keys(senderFilter).length > 0) where.sender = senderFilter;

      const [connections, total] = await Promise.all([
        (prisma as any).connection.findMany({
          where,
          include: {
            sender: {
              select: {
                id: true,
                unique_id: true,
                first_name: true,
                last_name: true,
                role: true,
                personalInfo: { select: { profileImage: true, title: true } },
              },
            },
          },
          orderBy: { created_at: 'desc' },
          take: limit,
          skip: offset,
        }),
        (prisma as any).connection.count({ where }),
      ]);

      const { resolveAttachmentUrl } = await import('@services/attachmentService');
      const { getDisplayName } = await import('@utils/General');

      const data = await Promise.all(
        connections.map(async (c: any) => {
          const { firstName, lastName } = getDisplayName(
            { first_name: c.sender.first_name, last_name: c.sender.last_name },
            { maskLastName: true }
          );
          return {
            connectionId: c.id,
            note: c.note,
            createdAt: c.created_at,
            sender: {
              id: c.sender.id,
              uniqueId: c.sender.unique_id,
              firstName,
              lastName,
              role: c.sender.role,
              profileImage: c.sender.personalInfo?.profileImage
                ? await resolveAttachmentUrl(c.sender.personalInfo.profileImage, 'profile_image')
                : null,
              tagline: c.sender.personalInfo?.title || null,
            },
          };
        })
      );

      return { success: true, message: 'OK', data: { connections: data, total } };
    } catch (error: any) {
      Log.error('Get received requests error', { error });
      return { success: false, message: 'Failed to get connection requests' };
    }
  }

  /**
   * List all connections (accepted) for a user.
   */
  static async getConnections(userId: number, limit = 20, offset = 0, search?: string, role?: string): Promise<ServiceResponse> {
    try {
      const userFilter: any = {};
      if (search) {
        userFilter.OR = [
          { first_name: { contains: search, mode: 'insensitive' } },
          { last_name: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (role) userFilter.role = role;
      const hasFilter = Object.keys(userFilter).length > 0;

      const where: any = {
        status: 'CONNECTED',
        ...(hasFilter
          ? {
              OR: [
                { sender_id: userId, receiver: userFilter },
                { receiver_id: userId, sender: userFilter },
              ],
            }
          : {
              OR: [{ sender_id: userId }, { receiver_id: userId }],
            }),
      };

      const userSelect = {
        id: true, unique_id: true, first_name: true, last_name: true, role: true,
        personalInfo: { select: { profileImage: true, title: true } },
      };

      const [connections, total] = await Promise.all([
        (prisma as any).connection.findMany({
          where,
          include: { sender: { select: userSelect }, receiver: { select: userSelect } },
          orderBy: { updated_at: 'desc' },
          take: limit,
          skip: offset,
        }),
        (prisma as any).connection.count({ where }),
      ]);

      const { resolveAttachmentUrl } = await import('@services/attachmentService');
      const { getDisplayName } = await import('@utils/General');

      const data = await Promise.all(
        connections.map(async (c: any) => {
          const other = c.sender_id === userId ? c.receiver : c.sender;
          const { firstName, lastName } = getDisplayName(
            { first_name: other.first_name, last_name: other.last_name },
            { maskLastName: true }
          );
          return {
            connectionId: c.id,
            connectedAt: c.updated_at,
            user: {
              id: other.id,
              uniqueId: other.unique_id,
              firstName,
              lastName,
              role: other.role,
              profileImage: other.personalInfo?.profileImage
                ? await resolveAttachmentUrl(other.personalInfo.profileImage, 'profile_image')
                : null,
              tagline: other.personalInfo?.title || null,
            },
          };
        })
      );

      return { success: true, message: 'OK', data: { connections: data, total } };
    } catch (error: any) {
      Log.error('Get connections error', { error });
      return { success: false, message: 'Failed to get connections' };
    }
  }

  /**
   * List sent connection requests by user.
   */
  static async getSentRequests(userId: number, limit = 20, offset = 0, search?: string, role?: string): Promise<ServiceResponse> {
    try {
      const receiverFilter: any = {};
      if (search) {
        receiverFilter.OR = [
          { first_name: { contains: search, mode: 'insensitive' } },
          { last_name: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (role) receiverFilter.role = role;

      const where: any = { sender_id: userId, status: 'REQUESTED' };
      if (Object.keys(receiverFilter).length > 0) where.receiver = receiverFilter;

      const [connections, total] = await Promise.all([
        (prisma as any).connection.findMany({
          where,
          include: {
            receiver: {
              select: {
                id: true, unique_id: true, first_name: true, last_name: true, role: true,
                personalInfo: { select: { profileImage: true, title: true } },
              },
            },
          },
          orderBy: { created_at: 'desc' },
          take: limit,
          skip: offset,
        }),
        (prisma as any).connection.count({ where }),
      ]);

      const { resolveAttachmentUrl } = await import('@services/attachmentService');
      const { getDisplayName } = await import('@utils/General');

      const data = await Promise.all(
        connections.map(async (c: any) => {
          const { firstName, lastName } = getDisplayName(
            { first_name: c.receiver.first_name, last_name: c.receiver.last_name },
            { maskLastName: true }
          );
          return {
            connectionId: c.id,
            note: c.note,
            createdAt: c.created_at,
            receiver: {
              id: c.receiver.id,
              uniqueId: c.receiver.unique_id,
              firstName,
              lastName,
              role: c.receiver.role,
              profileImage: c.receiver.personalInfo?.profileImage
                ? await resolveAttachmentUrl(c.receiver.personalInfo.profileImage, 'profile_image')
                : null,
              tagline: c.receiver.personalInfo?.title || null,
            },
          };
        })
      );

      return { success: true, message: 'OK', data: { connections: data, total } };
    } catch (error: any) {
      Log.error('Get sent requests error', { error });
      return { success: false, message: 'Failed to get sent requests' };
    }
  }

  /** Helper: set conversation between two users to ACCEPTED */
  private static async acceptConversation(userId1: number, userId2: number) {
    const [u1, u2] = userId1 <= userId2 ? [userId1, userId2] : [userId2, userId1];
    await (prisma as any).conversation.updateMany({
      where: { user1_id: u1, user2_id: u2 },
      data: { status: 'ACCEPTED' },
    });
  }
}
