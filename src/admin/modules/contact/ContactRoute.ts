import { Router } from 'express';
import { listContacts, getContact, updateContact } from './ContactController';
import { requireAdmin, requirePermission } from '@admin/middleware/auth';
import { PERMISSIONS } from '@admin/constants/permissions';

const router = Router();

router.use(requireAdmin);

router.get('/', requirePermission(PERMISSIONS.CONTACTS_VIEW), listContacts);
router.get('/:id', requirePermission(PERMISSIONS.CONTACTS_VIEW), getContact);
router.patch('/:id', requirePermission(PERMISSIONS.CONTACTS_MANAGE), updateContact);

export default router;
