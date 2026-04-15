import { Router } from 'express';
import { AvailabilityController } from './AvailabilityController';
import { authenticateToken } from '@middleware/auth';

const router = Router();

router.get('/public/:uniqueId', AvailabilityController.getPublicAvailability);
router.get('/', authenticateToken, AvailabilityController.getAvailability);
router.post('/', authenticateToken, AvailabilityController.saveAvailability);

export default router;
