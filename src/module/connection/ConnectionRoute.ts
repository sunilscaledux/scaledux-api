import { Router } from 'express';
import { authenticateToken } from '@middleware/auth';
import { requireCompleteProfile } from '@middleware/requireCompleteProfile';
import { ConnectionController } from './ConnectionController';

const router = Router();
router.use(authenticateToken);

router.get('/', ConnectionController.getConnections);
router.get('/requests', ConnectionController.getReceivedRequests);
router.get('/sent', ConnectionController.getSentRequests);
router.get('/status/:uniqueId', ConnectionController.getStatus);
router.post('/request', requireCompleteProfile(), ConnectionController.sendRequest);
router.patch('/:id/accept', requireCompleteProfile(), ConnectionController.acceptRequest);
router.patch('/:id/reject', ConnectionController.rejectRequest);
router.patch('/:id/withdraw', ConnectionController.withdrawRequest);
router.patch('/:id/disconnect', ConnectionController.disconnectConnection);

export default router;
