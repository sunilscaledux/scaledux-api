import { Router } from 'express';
import { listBugReports, getBugReport, updateBugReport } from './BugReportController';
import { requireAdmin, requirePermission } from '@admin/middleware/auth';
import { PERMISSIONS } from '@admin/constants/permissions';

const router = Router();

router.use(requireAdmin);

router.get('/', requirePermission(PERMISSIONS.BUG_REPORTS_VIEW), listBugReports);
router.get('/:id', requirePermission(PERMISSIONS.BUG_REPORTS_VIEW), getBugReport);
router.patch('/:id', requirePermission(PERMISSIONS.BUG_REPORTS_MANAGE), updateBugReport);

export default router;
