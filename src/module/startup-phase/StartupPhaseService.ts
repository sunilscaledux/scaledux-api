import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";
import { Log } from '@services/loggerService';
import { markAttachmentsAttached, resolveAttachmentUrl, urlOrPathToAttachmentId } from '@services/attachmentService';

type DeliverableFile = {
  url: string;
  name: string;
  size?: number;
  uploaded_at?: string;
};

type DeliverablesMap = Record<string, DeliverableFile>;

/**
 * List all startup phases with their activities and deliverables.
 * If industryId is provided, returns industry-specific phases (falls back to generic if none).
 */
export async function listStartupPhases(industryId: number | null): Promise<ServiceResponse> {
  try {
    // Try industry-specific first, fall back to generic (industry_id = null)
    let phases = industryId != null
      ? await prisma.startupPhase.findMany({
          where: { industry_id: industryId },
          orderBy: { index: 'asc' },
          include: {
            activities: { orderBy: { order: 'asc' } },
            deliverables: { orderBy: { order: 'asc' } },
          },
        })
      : [];

    if (phases.length === 0) {
      phases = await prisma.startupPhase.findMany({
        where: { industry_id: null },
        orderBy: { index: 'asc' },
        include: {
          activities: { orderBy: { order: 'asc' } },
          deliverables: { orderBy: { order: 'asc' } },
        },
      });
    }

    // Transform to frontend format: split activities into must_have/good_to_have
    const result = phases.map((p: any) => ({
      id: p.id,
      index: p.index,
      display_index: p.display_index,
      industry_id: p.industry_id,
      name: p.name,
      short_name: p.short_name,
      objective: p.objective,
      must_have: p.activities
        .filter((a: any) => a.type === 'must_have')
        .map((a: any) => ({ id: a.id, title: a.title, details: a.details })),
      good_to_have: p.activities
        .filter((a: any) => a.type === 'good_to_have')
        .map((a: any) => ({ id: a.id, title: a.title, details: a.details })),
      deliverables: p.deliverables.map((d: any) => ({
        id: d.id,
        title: d.title,
        details: d.details,
      })),
    }));

    return { success: true, message: 'OK', data: result };
  } catch (error: any) {
    Log.error('listStartupPhases error', { error });
    return { success: false, message: error.message || 'Failed to fetch startup phases' };
  }
}

/**
 * Get a founder's startup progress by unique_id (public, read-only).
 * Does NOT auto-create — returns null data if no progress exists.
 */
export async function getPublicStartupProgress(founderUniqueId: string): Promise<ServiceResponse> {
  try {
    const user = await prisma.user.findUnique({
      where: { unique_id: founderUniqueId },
      select: { id: true, role: true },
    });
    if (!user || user.role !== 'founder') {
      return { success: false, message: 'Founder not found' };
    }

    const progress = await prisma.userStartupProgress.findUnique({
      where: { user_id: user.id },
    });
    if (!progress) {
      return { success: true, message: 'OK', data: { current_phase_id: null, completed_activities: [], deliverables: {} } };
    }

    const rawDeliverables = (progress.deliverables as DeliverablesMap) || {};
    const resolved: DeliverablesMap = {};
    for (const [key, file] of Object.entries(rawDeliverables)) {
      const attId = urlOrPathToAttachmentId(file.url) || file.url;
      const url = await resolveAttachmentUrl(attId, 'startup_deliverable').catch(() => file.url);
      resolved[key] = { ...file, url: url || file.url };
    }

    return {
      success: true,
      message: 'OK',
      data: {
        current_phase_id: progress.current_phase_id,
        completed_activities: (progress.completed_activities as string[]) || [],
        deliverables: resolved,
      },
    };
  } catch (error: any) {
    Log.error('getPublicStartupProgress error', { error });
    return { success: false, message: error.message || 'Failed to fetch startup progress' };
  }
}

/** Get current user's startup progress (auto-creates if missing). */
export async function getUserStartupProgress(userId: number): Promise<ServiceResponse> {
  try {
    let progress = await prisma.userStartupProgress.findUnique({
      where: { user_id: userId },
    });

    if (!progress) {
      progress = await prisma.userStartupProgress.create({
        data: { user_id: userId, completed_activities: [], deliverables: {} },
      });
    }

    // Resolve deliverable file URLs (they're stored as attachment IDs)
    const rawDeliverables = (progress.deliverables as DeliverablesMap) || {};
    const resolved: DeliverablesMap = {};
    for (const [key, file] of Object.entries(rawDeliverables)) {
      const attId = urlOrPathToAttachmentId(file.url) || file.url;
      const url = await resolveAttachmentUrl(attId, 'startup_deliverable').catch(() => file.url);
      resolved[key] = { ...file, url: url || file.url };
    }

    return {
      success: true,
      message: 'OK',
      data: {
        current_phase_id: progress.current_phase_id,
        completed_activities: (progress.completed_activities as string[]) || [],
        deliverables: resolved,
      },
    };
  } catch (error: any) {
    Log.error('getUserStartupProgress error', { error });
    return { success: false, message: error.message || 'Failed to fetch startup progress' };
  }
}

/** Set the founder's current phase. */
export async function setCurrentPhase(userId: number, phaseId: number): Promise<ServiceResponse> {
  try {
    if (!phaseId || Number.isNaN(phaseId)) {
      return { success: false, message: 'Valid phase id is required' };
    }

    const phase = await prisma.startupPhase.findUnique({ where: { id: phaseId } });
    if (!phase) {
      return { success: false, message: 'Invalid phase id' };
    }

    await prisma.userStartupProgress.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        current_phase_id: phase.id,
        completed_activities: [],
        deliverables: {},
      },
      update: { current_phase_id: phase.id },
    });

    return getUserStartupProgress(userId);
  } catch (error: any) {
    Log.error('setCurrentPhase error', { error });
    return { success: false, message: error.message || 'Failed to set current phase' };
  }
}

/** Toggle an activity's completion state. */
export async function toggleActivity(
  userId: number,
  activityId: number,
  completed: boolean
): Promise<ServiceResponse> {
  try {
    if (!activityId || Number.isNaN(activityId)) {
      return { success: false, message: 'Valid activity id is required' };
    }

    // Validate activity exists
    const activity = await prisma.startupPhaseActivity.findUnique({
      where: { id: activityId },
    });
    if (!activity) {
      return { success: false, message: 'Invalid activity id' };
    }

    const idStr = String(activityId);
    const progress = await prisma.userStartupProgress.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        completed_activities: completed ? [idStr] : [],
        deliverables: {},
      },
      update: {},
    });

    const current = new Set((progress.completed_activities as string[]) || []);
    if (completed) current.add(idStr);
    else current.delete(idStr);

    await prisma.userStartupProgress.update({
      where: { user_id: userId },
      data: { completed_activities: Array.from(current) },
    });

    return getUserStartupProgress(userId);
  } catch (error: any) {
    Log.error('toggleActivity error', { error });
    return { success: false, message: error.message || 'Failed to toggle activity' };
  }
}

/** Save an uploaded deliverable file (called after FileUpload middleware). */
export async function saveDeliverableFile(
  userId: number,
  deliverableId: number,
  attachmentId: string,
  originalName: string,
  size?: number
): Promise<ServiceResponse> {
  try {
    if (!deliverableId || Number.isNaN(deliverableId)) {
      return { success: false, message: 'Valid deliverable id is required' };
    }

    const deliverable = await prisma.startupPhaseDeliverable.findUnique({
      where: { id: deliverableId },
    });
    if (!deliverable) {
      return { success: false, message: 'Invalid deliverable id' };
    }

    // Mark attachment as attached + grant access to founder
    await markAttachmentsAttached([attachmentId], [userId]);

    const progress = await prisma.userStartupProgress.upsert({
      where: { user_id: userId },
      create: { user_id: userId, completed_activities: [], deliverables: {} },
      update: {},
    });

    const deliverables = ((progress.deliverables as DeliverablesMap) || {});
    deliverables[String(deliverableId)] = {
      url: attachmentId,
      name: originalName,
      size,
      uploaded_at: new Date().toISOString(),
    };

    await prisma.userStartupProgress.update({
      where: { user_id: userId },
      data: { deliverables: deliverables as object },
    });

    const url = await resolveAttachmentUrl(attachmentId, 'startup_deliverable').catch(() => attachmentId);

    return {
      success: true,
      message: 'Deliverable uploaded successfully',
      data: { url, name: originalName, size, uploaded_at: deliverables[String(deliverableId)].uploaded_at },
    };
  } catch (error: any) {
    Log.error('saveDeliverableFile error', { error });
    return { success: false, message: error.message || 'Failed to save deliverable' };
  }
}

/** Remove a deliverable file from the founder's progress. */
export async function deleteDeliverableFile(
  userId: number,
  deliverableId: number
): Promise<ServiceResponse> {
  try {
    const progress = await prisma.userStartupProgress.findUnique({
      where: { user_id: userId },
    });
    if (!progress) {
      return { success: false, message: 'No progress found' };
    }

    const deliverables = ((progress.deliverables as DeliverablesMap) || {});
    const idKey = String(deliverableId);
    if (!deliverables[idKey]) {
      return { success: false, message: 'Deliverable not found' };
    }

    delete deliverables[idKey];

    await prisma.userStartupProgress.update({
      where: { user_id: userId },
      data: { deliverables: deliverables as object },
    });

    return { success: true, message: 'Deliverable removed' };
  } catch (error: any) {
    Log.error('deleteDeliverableFile error', { error });
    return { success: false, message: error.message || 'Failed to delete deliverable' };
  }
}
