import { Router } from 'express';
import {
  listUsers,
  getUser,
  updateStatus,
  setDeactivation,
  updateRole,
  impersonate,
  getUserTransactions,
} from './UserController';
import { requireAdmin, requirePermission } from '@admin/middleware/auth';
import { PERMISSIONS } from '@admin/constants/permissions';

const router = Router();

router.use(requireAdmin);

router.get('/', requirePermission(PERMISSIONS.USERS_VIEW), listUsers);
router.get('/:uniqueId', requirePermission(PERMISSIONS.USERS_VIEW), getUser);
router.get('/:uniqueId/transactions', requirePermission(PERMISSIONS.USERS_VIEW), getUserTransactions);
router.patch('/:id/status', requirePermission(PERMISSIONS.USERS_SUSPEND), updateStatus);
router.patch('/:id/deactivation', requirePermission(PERMISSIONS.USERS_SUSPEND), setDeactivation);
router.patch('/:id/role', requirePermission(PERMISSIONS.USERS_EDIT), updateRole);
router.post('/:id/impersonate', requirePermission(PERMISSIONS.USERS_IMPERSONATE), impersonate);

export default router;
