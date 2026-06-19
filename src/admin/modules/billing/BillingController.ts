import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '@services/prismaService';
import { ApiResponse } from '@utils/ApiResponse';
import { getPageParams, paginated, getDateRange } from '@admin/utils/pagination';
import { userCard, userCardSelect } from '@admin/utils/format';
import { auditFromReq } from '@admin/services/auditService';

/** Resolve {from,to,actor} ids that point at Users into compact cards. */
async function attachParties(rows: any[]) {
  const ids = new Set<number>();
  for (const r of rows) {
    if (r.from_type === 'User') ids.add(r.from_id);
    if (r.to_type === 'User') ids.add(r.to_id);
    if (r.actor_type === 'User') ids.add(r.actor_id);
  }
  if (ids.size === 0) return new Map<number, any>();
  const users = await prisma.user.findMany({ where: { id: { in: [...ids] } }, select: userCardSelect });
  return new Map(users.map((u) => [u.id, userCard(u)]));
}

export async function listTransactions(req: Request, res: Response) {
  const { page, limit, skip, search } = getPageParams(req);
  const type = req.query.type as string | undefined;
  const status = req.query.status as string | undefined;

  const where: Prisma.BillingTransactionWhereInput = {};
  if (type) where.type = type as any;
  if (status) where.status = status as any;
  if (search) where.unique_id = { contains: search };
  const created = getDateRange(req);
  if (created) where.created_at = created;

  const [rows, total] = await Promise.all([
    prisma.billingTransaction.findMany({ where, orderBy: { created_at: 'desc' }, skip, take: limit }),
    prisma.billingTransaction.count({ where }),
  ]);

  const parties = await attachParties(rows);
  const items = rows.map((t) => ({
    id: t.id,
    unique_id: t.unique_id,
    type: t.type,
    status: t.status,
    amount: Number(t.amount),
    payer_amount: t.payer_amount != null ? Number(t.payer_amount) : null,
    receiver_amount: t.receiver_amount != null ? Number(t.receiver_amount) : null,
    description: t.description,
    subject_type: t.subject_type,
    subject_id: t.subject_id,
    created_at: t.created_at,
    from: t.from_type === 'User' ? parties.get(t.from_id) ?? { id: t.from_id } : { type: t.from_type, id: t.from_id },
    to: t.to_type === 'User' ? parties.get(t.to_id) ?? { id: t.to_id } : { type: t.to_type, id: t.to_id },
  }));
  return ApiResponse.success(res, paginated(items, total, page, limit));
}

export async function getTransaction(req: Request, res: Response) {
  const { uniqueId } = req.params;
  const t = await prisma.billingTransaction.findUnique({
    where: { unique_id: uniqueId },
    include: { payer_invoice: true, receiver_invoice: true, invoice_a: true, milestone: true },
  });
  if (!t) return ApiResponse.notFound(res, 'Transaction not found');
  const parties = await attachParties([t]);
  return ApiResponse.success(res, {
    ...t,
    amount: Number(t.amount),
    from: t.from_type === 'User' ? parties.get(t.from_id) : { type: t.from_type, id: t.from_id },
    to: t.to_type === 'User' ? parties.get(t.to_id) : { type: t.to_type, id: t.to_id },
  });
}

export async function listInvoices(req: Request, res: Response) {
  const { page, limit, skip, search } = getPageParams(req);
  const invoiceType = req.query.invoice_type as string | undefined;

  const where: Prisma.InvoiceWhereInput = {};
  if (invoiceType) where.invoice_type = invoiceType;
  if (search) where.invoice_number = { contains: search, mode: 'insensitive' };
  const created = getDateRange(req);
  if (created) where.created_at = created;

  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({ where, orderBy: { created_at: 'desc' }, skip, take: limit }),
    prisma.invoice.count({ where }),
  ]);

  const items = rows.map((i) => ({
    id: i.id,
    invoice_number: i.invoice_number,
    invoice_type: i.invoice_type,
    party: i.party,
    sender_name: i.sender_name,
    receiver_name: i.receiver_name,
    amount: Number(i.amount),
    currency_code: i.currency_code,
    file_url: i.file_url,
    issued_at: i.issued_at,
  }));
  return ApiResponse.success(res, paginated(items, total, page, limit));
}

export async function listWithdrawals(req: Request, res: Response) {
  const { page, limit, skip } = getPageParams(req);
  const status = req.query.status as string | undefined;

  const where: Prisma.WithdrawalRequestWhereInput = {};
  if (status) where.status = status as any;
  const created = getDateRange(req);
  if (created) where.created_at = created;

  const [rows, total] = await Promise.all([
    prisma.withdrawalRequest.findMany({
      where,
      include: {
        user: { select: userCardSelect },
        withdrawal_method: { select: { id: true } },
        billing_transaction: { select: { unique_id: true, amount: true } },
      },
      orderBy: { withdrawal_trigger_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.withdrawalRequest.count({ where }),
  ]);

  const items = rows.map((w) => ({
    id: w.id,
    status: w.status,
    withdrawal_trigger_at: w.withdrawal_trigger_at,
    processed_at: w.processed_at,
    error_message: w.error_message,
    amount: w.billing_transaction ? Number(w.billing_transaction.amount) : null,
    transaction_unique_id: w.billing_transaction?.unique_id ?? null,
    user: userCard(w.user),
  }));
  return ApiResponse.success(res, paginated(items, total, page, limit));
}

export async function updateWithdrawalStatus(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { status, error_message } = req.body || {};
  const valid = ['pending', 'processing', 'completed', 'failed'];
  if (!valid.includes(status)) return ApiResponse.error(res, `status must be one of ${valid.join(', ')}`, null, 400);

  const w = await prisma.withdrawalRequest.update({
    where: { id },
    data: {
      status,
      processed_at: status === 'completed' || status === 'failed' ? new Date() : null,
      error_message: status === 'failed' ? error_message ?? null : null,
    },
  });
  await auditFromReq(req, 'billing.withdrawal.update', { entityType: 'WithdrawalRequest', entityId: id, metadata: { status } });
  return ApiResponse.success(res, { id: w.id, status: w.status }, 'Withdrawal status updated');
}

/**
 * Record a refund against an existing payment transaction.
 * NOTE: this records the ledger entry + audit only. The actual money movement
 * (Razorpay refund) is handled by the main API's payment integration.
 */
export async function recordRefund(req: Request, res: Response) {
  const { transactionUniqueId, amount, reason } = req.body || {};
  if (!transactionUniqueId) return ApiResponse.error(res, 'transactionUniqueId is required', null, 400);

  const original = await prisma.billingTransaction.findUnique({ where: { unique_id: transactionUniqueId } });
  if (!original) return ApiResponse.notFound(res, 'Original transaction not found');

  const refundAmount = amount != null ? Number(amount) : Number(original.amount);

  const refund = await prisma.billingTransaction.create({
    data: {
      actor_type: 'Admin',
      actor_id: req.admin!.id,
      from_type: original.to_type,
      from_id: original.to_id,
      to_type: original.from_type,
      to_id: original.from_id,
      subject_type: original.subject_type,
      subject_id: original.subject_id,
      milestone_id: original.milestone_id,
      amount: new Prisma.Decimal(refundAmount),
      currency_id: original.currency_id,
      type: 'refund',
      status: 'completed',
      description: reason || `Refund of ${original.unique_id}`,
    },
  });

  await auditFromReq(req, 'billing.refund', {
    entityType: 'BillingTransaction',
    entityId: original.id,
    description: reason,
    metadata: { refundId: refund.id, amount: refundAmount },
  });
  return ApiResponse.created(res, { id: refund.id, unique_id: refund.unique_id }, 'Refund recorded');
}
