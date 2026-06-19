import { Router } from 'express';
import { listAuditLogs } from './AuditController';
import { requireAdmin, requirePermission } from '@admin/middleware/auth';
import { PERMISSIONS } from '@admin/constants/permissions';

const router = Router();

router.use(requireAdmin, requirePermission(PERMISSIONS.AUDIT_VIEW));
router.get('/', listAuditLogs);

export default router;
