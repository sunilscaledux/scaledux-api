import { prisma } from "@services/prismaService";
import { CreateSuccessStoryInput, UpdateSuccessStoryInput } from "./SuccessStoryType";
import { ServiceResponse } from "@utils/ApiResponse";
import { resolveAttachmentUrls, urlsOrPathsToAttachmentIds, markAttachmentsAttached } from "@services/attachmentService";
import { updateCompletionSection } from "../profile/ProfileCompletionService";
import { Log } from '@services/loggerService';

export class SuccessStoryService {
  static async getSuccessStories(userId: number): Promise<ServiceResponse> {
    try {
      const stories = await prisma.successStory.findMany({
        where: { user_id: userId },
        orderBy: [{ date: 'desc' }, { created_at: 'desc' }]
      });

      const storiesWithUrls = await Promise.all(stories.map(async story => ({
        ...story,
        media_files: Array.isArray(story.media_files)
          ? await resolveAttachmentUrls(story.media_files as string[], 'success_story_media')
          : []
      })));

      return {
        success: true,
        message: 'Success stories retrieved successfully',
        data: storiesWithUrls
      };
    } catch (error) {
      Log.error("Error", { error });
      return { success: false, message: 'Internal server error' };
    }
  }

  static async createSuccessStory(userId: number, data: CreateSuccessStoryInput): Promise<ServiceResponse> {
    try {
      const story = await prisma.successStory.create({
        data: {
          user_id: userId,
          title: data.title,
          description: data.description || undefined,
          date: data.date ? new Date(data.date) : undefined,
          organisation_name: data.organisation_name,
          client_name: data.client_name || undefined,
          linkedin_link: data.linkedin_link || undefined,
          media_files: Array.isArray(data.media_files) ? urlsOrPathsToAttachmentIds(data.media_files) : undefined
        }
      });

      const mediaIds = Array.isArray(story.media_files) ? (story.media_files as string[]) : [];
      if (mediaIds.length > 0) await markAttachmentsAttached(mediaIds, [userId]);
      await updateCompletionSection(userId, 'successStoryHighlights', true);

      return {
        success: true,
        message: 'Success story created successfully',
        data: {
          ...story,
          media_files: Array.isArray(story.media_files)
            ? await resolveAttachmentUrls(story.media_files as string[], 'success_story_media')
            : []
        }
      };
    } catch (error) {
      Log.error("Error", { error });
      return { success: false, message: 'Internal server error' };
    }
  }

  static async updateSuccessStory(userId: number, data: UpdateSuccessStoryInput): Promise<ServiceResponse> {
    try {
      const existing = await prisma.successStory.findFirst({
        where: { id: data.id, user_id: userId }
      });

      if (!existing) {
        return { success: false, message: 'Success story not found' };
      }

      const updated = await prisma.successStory.update({
        where: { id: data.id },
        data: {
          title: data.title,
          description: data.description || undefined,
          date: data.date ? new Date(data.date) : undefined,
          organisation_name: data.organisation_name,
          client_name: data.client_name || undefined,
          linkedin_link: data.linkedin_link || undefined,
          media_files: Array.isArray(data.media_files) ? urlsOrPathsToAttachmentIds(data.media_files) : undefined
        }
      });

      const updatedMediaIds = Array.isArray(updated.media_files) ? (updated.media_files as string[]) : [];
      if (updatedMediaIds.length > 0) await markAttachmentsAttached(updatedMediaIds, [userId]);

      return {
        success: true,
        message: 'Success story updated successfully',
        data: {
          ...updated,
          media_files: Array.isArray(updated.media_files)
            ? await resolveAttachmentUrls(updated.media_files as string[], 'success_story_media')
            : []
        }
      };
    } catch (error) {
      Log.error("Error", { error });
      return { success: false, message: 'Internal server error' };
    }
  }

  static async deleteSuccessStory(userId: number, storyId: number): Promise<ServiceResponse> {
    try {
      const existing = await prisma.successStory.findFirst({
        where: { id: storyId, user_id: userId }
      });

      if (!existing) {
        return { success: false, message: 'Success story not found' };
      }

      await prisma.successStory.delete({ where: { id: storyId } });
      const remaining = await prisma.successStory.count({ where: { user_id: userId } });
      await updateCompletionSection(userId, 'successStoryHighlights', remaining > 0);

      return {
        success: true,
        message: 'Success story deleted successfully',
        data: null
      };
    } catch (error) {
      Log.error("Error", { error });
      return { success: false, message: 'Internal server error' };
    }
  }
}
