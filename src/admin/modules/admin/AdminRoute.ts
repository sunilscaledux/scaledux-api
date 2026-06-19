import { Router } from 'express';
import { listAdmins, createAdmin, updateAdmin, resetAdminPassword, deleteAdmin } from './AdminController';
import { requireAdmin, requireRole, requirePermission } from '@admin/middleware/auth';
import { PERMISSIONS } from '@admin/constants/permissions';

const router = Router();

router.use(requireAdmin);

// Viewing the admin list needs ADMINS_VIEW; all mutations are SUPER_ADMIN only.
router.get('/', requirePermission(PERMISSIONS.ADMINS_VIEW), listAdmins);
router.post('/', requireRole(['SUPER_ADMIN']), createAdmin);
router.patch('/:id', requireRole(['SUPER_ADMIN']), updateAdmin);
router.post('/:id/reset-password', requireRole(['SUPER_ADMIN']), resetAdminPassword);
router.delete('/:id', requireRole(['SUPER_ADMIN']), deleteAdmin);

export default router;
