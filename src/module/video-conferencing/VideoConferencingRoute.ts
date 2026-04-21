import { Router } from 'express';
import { VideoConferencingController } from './VideoConferencingController';
import { authenticateToken } from '@middleware/auth';

const router = Router();

// Zoom
router.get('/zoom/auth-url', authenticateToken, VideoConferencingController.zoomAuthUrl);
router.post('/zoom/callback', authenticateToken, VideoConferencingController.zoomCallback);
router.delete('/zoom/disconnect', authenticateToken, VideoConferencingController.zoomDisconnect);
router.get('/zoom/status', authenticateToken, VideoConferencingController.zoomStatus);

// Microsoft Teams
router.get('/ms-teams/auth-url', authenticateToken, VideoConferencingController.msTeamsAuthUrl);
router.post('/ms-teams/callback', authenticateToken, VideoConferencingController.msTeamsCallback);
router.delete('/ms-teams/disconnect', authenticateToken, VideoConferencingController.msTeamsDisconnect);
router.get('/ms-teams/status', authenticateToken, VideoConferencingController.msTeamsStatus);

// Aggregate status
router.get('/status', authenticateToken, VideoConferencingController.getStatus);

// Default provider preference
router.post('/preference', authenticateToken, VideoConferencingController.savePreference);
router.get('/preference', authenticateToken, VideoConferencingController.getPreference);

export default router;
