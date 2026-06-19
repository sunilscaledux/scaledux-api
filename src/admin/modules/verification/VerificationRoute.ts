import { Router } from 'express';
import { listIdentity, reviewIdentity, listAgency, reviewAgency } from './VerificationController';
import { requireAdmin, requirePermission } from '@admin/middleware/auth';
import { PERMISSIONS } from '@admin/constants/permissions';

const router = Router();

router.use(requireAdmin);

router.get('/identity', requirePermission(PERMISSIONS.VERIFICATIONS_VIEW), listIdentity);
router.patch('/identity/:id', requirePermission(PERMISSIONS.VERIFICATIONS_REVIEW), reviewIdentity);
router.get('/agency', requirePermission(PERMISSIONS.VERIFICATIONS_VIEW), listAgency);
router.patch('/agency/:id', requirePermission(PERMISSIONS.VERIFICATIONS_REVIEW), reviewAgency);

export default router;
