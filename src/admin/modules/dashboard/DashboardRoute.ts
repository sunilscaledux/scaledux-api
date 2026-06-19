import { Router } from 'express';
import { getStats, getCharts } from './DashboardController';
import { requireAdmin, requirePermission } from '@admin/middleware/auth';
import { PERMISSIONS } from '@admin/constants/permissions';

const router = Router();

router.use(requireAdmin, requirePermission(PERMISSIONS.DASHBOARD_VIEW));
router.get('/stats', getStats);
router.get('/charts', getCharts);

export default router;
