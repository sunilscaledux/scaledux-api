import { Router } from 'express';
import { authenticateToken } from '@middleware/auth';
import { BlockController } from './BlockController';

const router = Router();
router.use(authenticateToken);

router.post('/', BlockController.blockUser);
router.delete('/:uniqueId', BlockController.unblockUser);
router.get('/', BlockController.getBlockedUsers);

export default router;
