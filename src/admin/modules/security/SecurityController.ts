import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { getPageParams, getDateRange } from '@admin/utils/pagination';
import { SecurityService } from './SecurityService';

/** Clamp an int query param to a sane range with a default. */
function intParam(raw: unknown, def: number, min: number, max: number): number {
  const n = parseInt(raw as string, 10);
  if (isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}

export async function listDeviceAnomalies(req: Request, res: Response) {
  const { page, limit, skip, search } = getPageParams(req);
  const result = await SecurityService.deviceAnomalies({
    page,
    limit,
    skip,
    windowHours: intParam(req.query.window_hours, 24, 1, 24 * 30),
    minDevices: intParam(req.query.min_devices, 3, 2, 50),
    created: getDateRange(req),
    search,
  });
  return ApiResponse.success(res, result.data);
}

export async function getUserDevices(req: Request, res: Response) {
  const uniqueId = req.params.uniqueId;
  if (!uniqueId) return ApiResponse.error(res, 'Invalid user', null, 400);
  const result = await SecurityService.userDevices(uniqueId, intParam(req.query.window_hours, 24, 1, 24 * 30));
  if (!result.success) return ApiResponse.notFound(res, result.message);
  return ApiResponse.success(res, result.data);
}
