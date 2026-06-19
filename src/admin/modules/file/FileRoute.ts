import { Router } from 'express';
import { viewFile } from './FileController';
import { requireAdmin } from '@admin/middleware/auth';

const router = Router();

// Any authenticated admin may view any file (public or private).
router.use(requireAdmin);
router.get('/view/:uniqueId', viewFile);

export default router;
