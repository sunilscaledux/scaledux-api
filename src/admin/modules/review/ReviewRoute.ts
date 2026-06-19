import { Router } from 'express';
import { listReviews, deleteReview } from './ReviewController';
import { requireAdmin, requirePermission } from '@admin/middleware/auth';
import { PERMISSIONS } from '@admin/constants/permissions';

const router = Router();

router.use(requireAdmin);

router.get('/', requirePermission(PERMISSIONS.REVIEWS_VIEW), listReviews);
router.delete('/:id', requirePermission(PERMISSIONS.REVIEWS_MODERATE), deleteReview);

export default router;
