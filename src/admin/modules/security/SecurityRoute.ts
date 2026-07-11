import { Router } from 'express';
import { listDeviceAnomalies, getUserDevices } from './SecurityController';
import { requireAdmin, requirePermission } from '@admin/middleware/auth';
import { PERMISSIONS } from '@admin/constants/permissions';

const router = Router();

router.use(requireAdmin, requirePermission(PERMISSIONS.SECURITY_VIEW));

router.get('/device-anomalies', listDeviceAnomalies);
router.get('/device-anomalies/:uniqueId', getUserDevices);

export default router;
