import { Router } from 'express';
import {
  listProjects,
  getProject,
  updateProjectStatus,
  takedownProject,
  restoreProject,
} from './ProjectController';
import { requireAdmin, requirePermission } from '@admin/middleware/auth';
import { PERMISSIONS } from '@admin/constants/permissions';

const router = Router();

router.use(requireAdmin);

router.get('/', requirePermission(PERMISSIONS.PROJECTS_VIEW), listProjects);
router.get('/:uniqueId', requirePermission(PERMISSIONS.PROJECTS_VIEW), getProject);
router.patch('/:id/status', requirePermission(PERMISSIONS.PROJECTS_MODERATE), updateProjectStatus);
router.post('/:id/takedown', requirePermission(PERMISSIONS.PROJECTS_MODERATE), takedownProject);
router.post('/:id/restore', requirePermission(PERMISSIONS.PROJECTS_MODERATE), restoreProject);

export default router;
