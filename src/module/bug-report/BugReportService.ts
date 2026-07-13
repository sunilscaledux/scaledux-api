import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { createAttachment } from "@services/attachmentService";
import type { AttachmentMetaItem } from "@middleware/fileupload";

export interface CreateBugReportParams {
  steps: string;
  pageUrl?: string | null;
  userAgent?: string | null;
  screenSize?: string | null;
  recordingDurationSeconds?: number | null;
  /** Uploaded recording (already streamed to Bunny by the upload middleware). */
  recording?: { meta: AttachmentMetaItem; visibility: "public" | "private" } | null;
}

const MAX_STEPS = 5000;

export class BugReportService {
  /**
   * Persist a user-submitted bug report. If a screen+mic recording was uploaded,
   * it is registered as a private Attachment and linked to the report so admins
   * can stream/download it later.
   */
  static async create(userId: number, params: CreateBugReportParams) {
    const steps = (params.steps || "").trim();
    if (!steps) {
      return { success: false, message: "Please describe the steps to reproduce the bug." };
    }
    if (steps.length > MAX_STEPS) {
      return { success: false, message: `Steps to reproduce is too long (max ${MAX_STEPS} characters).` };
    }

    let recordingAttachmentId: string | null = null;
    if (params.recording?.meta) {
      const m = params.recording.meta;
      const created = await createAttachment({
        ownerUserId: userId,
        uploadedByUserId: userId,
        path: m.path,
        disk: "bunny",
        visibility: params.recording.visibility ?? "private",
        mimeType: m.mimeType,
        sizeBytes: m.size,
        originalName: m.originalName,
        status: "attached",
        existingUniqueId: m.uniqueId,
      });
      recordingAttachmentId = created?.unique_id ?? null;
      if (!created) {
        // Don't fail the whole report if only the recording link failed to persist.
        Log.error(`[BugReport] Failed to persist recording attachment for user ${userId}`, { path: m.path });
      }
    }

    const duration =
      params.recordingDurationSeconds != null && Number.isFinite(params.recordingDurationSeconds)
        ? Math.max(0, Math.round(params.recordingDurationSeconds))
        : null;

    const report = await (prisma as any).bugReport.create({
      data: {
        reporter_id: userId,
        steps,
        page_url: params.pageUrl?.slice(0, 1024) || null,
        user_agent: params.userAgent?.slice(0, 2000) || null,
        screen_size: params.screenSize?.slice(0, 32) || null,
        recording_attachment_id: recordingAttachmentId,
        recording_duration_seconds: duration,
        status: "OPEN",
      },
    });

    Log.info(`[BugReport] Created #${report.id} by user ${userId}`, { hasRecording: !!recordingAttachmentId });

    return {
      success: true,
      message: "Thanks! Your bug report has been submitted.",
      data: { id: report.id, uniqueId: report.unique_id },
    };
  }
}
