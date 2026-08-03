import { Router } from 'express';
import {
  listSubscribers,
  exportSubscribers,
  updateSubscriber,
  deleteSubscriber,
} from './NewsletterController';
import { requireAdmin, requirePermission } from '@admin/middleware/auth';
import { PERMISSIONS } from '@admin/constants/permissions';

const router = Router();

router.use(requireAdmin);

router.get('/', requirePermission(PERMISSIONS.NEWSLETTER_VIEW), listSubscribers);
router.get('/export', requirePermission(PERMISSIONS.NEWSLETTER_VIEW), exportSubscribers);
router.patch('/:id', requirePermission(PERMISSIONS.NEWSLETTER_MANAGE), updateSubscriber);
router.delete('/:id', requirePermission(PERMISSIONS.NEWSLETTER_MANAGE), deleteSubscriber);

export default router;
