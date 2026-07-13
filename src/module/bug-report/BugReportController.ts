import { Request, Response } from "express";
import { ApiResponse } from "@utils/ApiResponse";
import { BugReportService } from "./BugReportService";
import type { AttachmentMetaItem } from "@middleware/fileupload";

export class BugReportController {
  static async create(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, "User not authenticated", null, 401);

    // The upload middleware streams the (optional) recording to Bunny and records its meta.
    const meta = (req as any).attachmentMeta as AttachmentMetaItem[] | undefined;
    const visibility = (req as any).uploadVisibility as "public" | "private" | undefined;
    const recording = meta?.length ? { meta: meta[0], visibility: visibility ?? "private" } : null;

    const durationRaw = req.body?.recordingDurationSeconds;
    const duration =
      durationRaw != null && String(durationRaw).trim() !== "" ? parseInt(String(durationRaw), 10) : null;

    const result = await BugReportService.create(userId, {
      steps: req.body?.steps,
      pageUrl: req.body?.pageUrl,
      userAgent: req.body?.userAgent || (req.headers["user-agent"] as string | undefined),
      screenSize: req.body?.screenSize,
      recordingDurationSeconds: duration != null && Number.isFinite(duration) ? duration : null,
      recording,
    });

    if (!result.success) return ApiResponse.error(res, result.message, null, 400);
    return ApiResponse.created(res, result.data, result.message);
  }
}
