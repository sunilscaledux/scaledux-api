import { Router } from 'express';
import { GoogleCalendarController } from './GoogleCalendarController';
import { authenticateToken } from '@middleware/auth';

const router = Router();

router.get('/auth-url', authenticateToken, GoogleCalendarController.getAuthUrl);
router.post('/callback', authenticateToken, GoogleCalendarController.callback);
router.delete('/disconnect', authenticateToken, GoogleCalendarController.disconnect);
router.get('/status', authenticateToken, GoogleCalendarController.getStatus);

export default router;
