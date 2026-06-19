import { Router } from 'express';
import { listReports, updateReportStatus } from './ReportController';
import { requireAdmin, requirePermission } from '@admin/middleware/auth';
import { PERMISSIONS } from '@admin/constants/permissions';

const router = Router();

router.use(requireAdmin);

router.get('/', requirePermission(PERMISSIONS.REPORTS_VIEW), listReports);
router.patch('/:id/status', requirePermission(PERMISSIONS.REPORTS_RESOLVE), updateReportStatus);

export default router;
