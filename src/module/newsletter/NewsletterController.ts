import { Request, Response } from "express";
import { ApiResponse } from "@utils/ApiResponse";
import { NewsletterService } from "./NewsletterService";

export class NewsletterController {
  static async subscribe(req: Request, res: Response) {
    const result = await NewsletterService.subscribe({
      email: req.body?.email,
      role: req.body?.role,
      source: req.body?.source,
      ipAddress: req.ip || req.socket.remoteAddress || null,
    });

    if (!result.success) return ApiResponse.error(res, result.message, null, 400);
    return ApiResponse.created(res, result.data, result.message);
  }
}
