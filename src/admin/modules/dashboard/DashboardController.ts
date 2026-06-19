import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { DashboardService } from './DashboardService';

export async function getStats(_req: Request, res: Response) {
  const result = await DashboardService.getStats();
  return ApiResponse.success(res, result.data);
}

export async function getCharts(_req: Request, res: Response) {
  const result = await DashboardService.getCharts();
  return ApiResponse.success(res, result.data);
}
