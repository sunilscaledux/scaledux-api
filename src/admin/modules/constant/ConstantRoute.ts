import { Router } from 'express';
import * as C from './ConstantController';
import { requireAdmin, requirePermission } from '@admin/middleware/auth';
import { PERMISSIONS } from '@admin/constants/permissions';

const router = Router();

router.use(requireAdmin);

const view = requirePermission(PERMISSIONS.CONSTANTS_VIEW);
const manage = requirePermission(PERMISSIONS.CONSTANTS_MANAGE);

router.get('/groups', view, C.listGroups);
router.get('/', view, C.listConstants);
router.post('/', manage, C.createConstant);
router.post('/reorder', manage, C.reorderConstants);
router.patch('/:id', manage, C.updateConstant);

export default router;
