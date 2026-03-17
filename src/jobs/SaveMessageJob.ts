import { BaseJob } from './BaseJob';
import { ConversationService } from '@module/chat/ConversationService';
import { publishSocketEvent } from '@services/socketPubSub';

export interface SaveMessageJobData {
  conversationId: string;
  userId: number;
  content: string;
  attachmentUrls?: string[];
  replyTo?: { messageId: number; unique_id: string; content: string; senderName?: string };
}

/**
 * Saves a chat message to the DB. Message realtime is published from the API when the job is queued.
 * Only conversation_status (e.g. ACCEPTED) is published from here when the save triggers a status change.
 */
export class SaveMessageJob extends BaseJob<SaveMessageJobData> {
  async handle(data: SaveMessageJobData): Promise<void> {
    const result = await ConversationService.sendMessage(
      data.conversationId,
      data.userId,
      data.content,
      data.attachmentUrls,
      data.replyTo,
      { skipEmit: true }
    );

    if (!result.success || !result.data) {
      throw new Error(result.message || 'Failed to save message');
    }

    const statusUpdate = (result as any).statusUpdate;
    if (statusUpdate) {
      await publishSocketEvent({
        type: 'conversation_status',
        userId: statusUpdate.userId,
        conversationId: statusUpdate.conversationId,
        status: statusUpdate.status
      });
    }
  }
}
