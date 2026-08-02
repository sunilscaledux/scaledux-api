import { Router } from 'express';
import {
  listTransactions,
  getTransaction,
  listTransfers,
  listInvoices,
  listWithdrawals,
  updateWithdrawalStatus,
  recordRefund,
} from './BillingController';
import { requireAdmin, requirePermission } from '@admin/middleware/auth';
import { PERMISSIONS } from '@admin/constants/permissions';

const router = Router();

router.use(requireAdmin);

router.get('/transactions', requirePermission(PERMISSIONS.BILLING_VIEW), listTransactions);
router.get('/transfers', requirePermission(PERMISSIONS.BILLING_VIEW), listTransfers);
router.get('/transactions/:uniqueId', requirePermission(PERMISSIONS.BILLING_VIEW), getTransaction);
router.get('/invoices', requirePermission(PERMISSIONS.BILLING_VIEW), listInvoices);
router.get('/withdrawals', requirePermission(PERMISSIONS.BILLING_VIEW), listWithdrawals);
router.patch('/withdrawals/:id', requirePermission(PERMISSIONS.BILLING_PAYOUT), updateWithdrawalStatus);
router.post('/refund', requirePermission(PERMISSIONS.BILLING_REFUND), recordRefund);

export default router;
