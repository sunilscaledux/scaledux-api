import { Router } from 'express';
import {
  listProposals,
  getProposal,
  terminateProposal,
  updateProposalStatus,
  getProposalActivity,
  getProposalChat,
} from './ProposalController';
import { requireAdmin, requirePermission } from '@admin/middleware/auth';
import { PERMISSIONS } from '@admin/constants/permissions';

const router = Router();

router.use(requireAdmin);

router.get('/', requirePermission(PERMISSIONS.PROPOSALS_VIEW), listProposals);
router.get('/:uniqueId', requirePermission(PERMISSIONS.PROPOSALS_VIEW), getProposal);
router.get('/:uniqueId/activity', requirePermission(PERMISSIONS.PROPOSALS_VIEW), getProposalActivity);
router.get('/:uniqueId/chat', requirePermission(PERMISSIONS.PROPOSALS_VIEW), getProposalChat);
router.patch('/:id/status', requirePermission(PERMISSIONS.PROPOSALS_MODERATE), updateProposalStatus);
router.post('/:id/terminate', requirePermission(PERMISSIONS.PROPOSALS_MODERATE), terminateProposal);

export default router;
