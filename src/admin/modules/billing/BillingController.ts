import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { getPageParams, getDateRange } from '@admin/utils/pagination';
import { auditFromReq } from '@admin/services/auditService';
import { BillingService } from './BillingService';
import { TransferService } from './TransferService';
import { InvoiceService, type InvoiceVariant } from './InvoiceService';

export async function listTransactions(req: Request, res: Response) {
  const { page, limit, skip, search } = getPageParams(req);
  const result = await BillingService.listTransactions({
    page,
    limit,
    skip,
    search,
    type: req.query.type as string | undefined,
    status: req.query.status as string | undefined,
    created: getDateRange(req),
  });
  return ApiResponse.success(res, result.data);
}

export async function getTransaction(req: Request, res: Response) {
  const { uniqueId } = req.params;
  const result = await BillingService.getTransaction(uniqueId);
  if (!result.success) return ApiResponse.notFound(res, result.message);
  return ApiResponse.success(res, result.data);
}

/** Invoice payload (A/B/C) for the admin-side PDF renderer. */
export async function getTransactionInvoice(req: Request, res: Response) {
  const type = req.query.type as InvoiceVariant | undefined;
  if (type && !['A', 'B', 'C'].includes(type)) return ApiResponse.error(res, 'type must be A, B or C', null, 400);
  const result = await InvoiceService.getInvoiceData(req.params.uniqueId, type);
  if (!result.success) return ApiResponse.notFound(res, result.message);
  return ApiResponse.success(res, result.data);
}

/** Razorpay Route transfers, enriched with the linked account owner + our billing transaction. */
export async function listTransfers(req: Request, res: Response) {
  const { page, limit, skip, search } = getPageParams(req);
  const result = await TransferService.listTransfers({
    page,
    limit,
    skip,
    search,
    status: req.query.status as string | undefined,
    created: getDateRange(req),
  });
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  return ApiResponse.success(res, result.data);
}

export async function getTransfer(req: Request, res: Response) {
  const result = await TransferService.getTransfer(req.params.id);
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  return ApiResponse.success(res, result.data);
}

export async function listInvoices(req: Request, res: Response) {
  const { page, limit, skip, search } = getPageParams(req);
  const result = await BillingService.listInvoices({
    page,
    limit,
    skip,
    search,
    invoiceType: req.query.invoice_type as string | undefined,
    created: getDateRange(req),
  });
  return ApiResponse.success(res, result.data);
}

export async function listWithdrawals(req: Request, res: Response) {
  const { page, limit, skip } = getPageParams(req);
  const result = await BillingService.listWithdrawals({
    page,
    limit,
    skip,
    status: req.query.status as string | undefined,
    created: getDateRange(req),
  });
  return ApiResponse.success(res, result.data);
}

export async function updateWithdrawalStatus(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await BillingService.updateWithdrawalStatus(id, req.body || {});
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'billing.withdrawal.update', { entityType: 'WithdrawalRequest', entityId: id, metadata: { status: req.body?.status } });
  return ApiResponse.success(res, result.data, result.message);
}

/**
 * Record a refund against an existing payment transaction.
 * NOTE: this records the ledger entry + audit only. The actual money movement
 * (Razorpay refund) is handled by the main API's payment integration.
 */
export async function recordRefund(req: Request, res: Response) {
  const result = await BillingService.recordRefund(req.body || {}, req.admin!.id);
  if (!result.success) {
    if (result.statusCode === 404) return ApiResponse.notFound(res, result.message);
    return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  }
  await auditFromReq(req, 'billing.refund', {
    entityType: 'BillingTransaction',
    entityId: result.data.originalId,
    description: req.body?.reason,
    metadata: { refundId: result.data.id, amount: result.data.refundAmount },
  });
  return ApiResponse.created(res, { id: result.data.id, unique_id: result.data.unique_id }, 'Refund recorded');
}
