import { Request, Response } from "express";
import { ApiResponse } from "@utils/ApiResponse";
import { ContactService } from "./ContactService";

export class ContactController {
  static async create(req: Request, res: Response) {
    const result = await ContactService.create({
      firstName: req.body?.firstName,
      lastName: req.body?.lastName,
      email: req.body?.email,
      phoneNumber: req.body?.phoneNumber,
      reason: req.body?.reason,
      subject: req.body?.subject,
      message: req.body?.message,
      ipAddress: req.ip || req.socket.remoteAddress || null,
    });

    if (!result.success) return ApiResponse.error(res, result.message, null, 400);
    return ApiResponse.created(res, result.data, result.message);
  }
}
