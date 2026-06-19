import { Router } from 'express';
import { login, logout, refresh, me, changePassword } from './AdminAuthController';
import { requireAdmin } from '@admin/middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', requireAdmin, logout);
router.get('/me', requireAdmin, me);
router.post('/change-password', requireAdmin, changePassword);

export default router;
