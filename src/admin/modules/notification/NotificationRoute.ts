import { Router } from 'express';
import { previewAudience, sendAnnouncement } from './NotificationController';
import { requireAdmin, requirePermission } from '@admin/middleware/auth';
import { PERMISSIONS } from '@admin/constants/permissions';

const router = Router();

router.use(requireAdmin, requirePermission(PERMISSIONS.NOTIFICATIONS_SEND));
router.post('/preview', previewAudience);
router.post('/broadcast', sendAnnouncement);

export default router;
