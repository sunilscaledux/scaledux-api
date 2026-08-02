import { Prisma } from '@prisma/client';
import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { paginated } from '@admin/utils/pagination';
import { userCard, userCardSelect, resolveImageRef } from '@admin/utils/format';
import { resolveAdminUrl } from '@admin/utils/attachments';
import { INVOICE_LABELS } from './InvoiceService';

/**
 * The 3 invoice docs that can hang off a billing transaction (service / service fee / platform fee).
 * Most have no stored PDF — those are rendered on demand from /invoice, same as the user's own
 * billing history does — so an invoice is listed whenever its row exists, url or not.
 */
const INVOICE_SELECT = { select: { file_url: true, invoice_number: true } } as const;
function txInvoices(t: any) {
  const entry = (type: 'A' | 'B' | 'C', inv: any) =>
    inv && { type, label: INVOICE_LABELS[type], url: resolveImageRef(inv.file_url), number: inv.invoice_number };
  return [entry('A', t.invoice_a), entry('B', t.receiver_invoice), entry('C', t.payer_invoice)].filter(Boolean);
}

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

export interface TransactionListParams {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  type?: string;
  status?: string;
  created?: { gte?: Date; lte?: Date } | undefined;
}

export interface InvoiceListParams {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  invoiceType?: string;
  created?: { gte?: Date; lte?: Date } | undefined;
}

export interface WithdrawalListParams {
  page: number;
  limit: number;
  skip: number;
  status?: string;
  created?: { gte?: Date; lte?: Date } | undefined;
}

export class BillingService {
  static async listTransactions(p: TransactionListParams): Promise<ServiceResponse> {
    const where: Prisma.BillingTransactionWhereInput = {};
    if (p.type) where.type = p.type as any;
    if (p.status) where.status = p.status as any;
    if (p.search) where.unique_id = { contains: p.search };
    if (p.created) where.created_at = p.created;

    const [rows, total] = await Promise.all([
      prisma.billingTransaction.findMany({
        where,
        include: { payer_invoice: INVOICE_SELECT, receiver_invoice: INVOICE_SELECT, invoice_a: INVOICE_SELECT },
        orderBy: { created_at: 'desc' },
        skip: p.skip,
        take: p.limit,
      }),
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
      invoices: txInvoices(t),
      created_at: t.created_at,
      from: t.from_type === 'User' ? parties.get(t.from_id) ?? { id: t.from_id } : { type: t.from_type, id: t.from_id },
      to: t.to_type === 'User' ? parties.get(t.to_id) ?? { id: t.to_id } : { type: t.to_type, id: t.to_id },
    }));
    return { success: true, message: 'OK', data: paginated(items, total, p.page, p.limit) };
  }

  static async getTransaction(uniqueId: string): Promise<ServiceResponse> {
    const t = await prisma.billingTransaction.findUnique({
      where: { unique_id: uniqueId },
      include: { payer_invoice: true, receiver_invoice: true, invoice_a: true, milestone: true },
    });
    if (!t) return { success: false, message: 'Transaction not found', statusCode: 404 };
    const parties = await attachParties([t]);
    return {
      success: true,
      message: 'OK',
      data: {
        ...t,
        amount: Number(t.amount),
        from: t.from_type === 'User' ? parties.get(t.from_id) : { type: t.from_type, id: t.from_id },
        to: t.to_type === 'User' ? parties.get(t.to_id) : { type: t.to_type, id: t.to_id },
      },
    };
  }

  static async listInvoices(p: InvoiceListParams): Promise<ServiceResponse> {
    const where: Prisma.InvoiceWhereInput = {};
    if (p.invoiceType) where.invoice_type = p.invoiceType;
    if (p.search) where.invoice_number = { contains: p.search, mode: 'insensitive' };
    if (p.created) where.created_at = p.created;

    const [rows, total] = await Promise.all([
      prisma.invoice.findMany({ where, orderBy: { created_at: 'desc' }, skip: p.skip, take: p.limit }),
      prisma.invoice.count({ where }),
    ]);

    const items = await Promise.all(
      rows.map(async (i) => ({
        id: i.id,
        invoice_number: i.invoice_number,
        invoice_type: i.invoice_type,
        party: i.party,
        sender_name: i.sender_name,
        receiver_name: i.receiver_name,
        amount: Number(i.amount),
        currency_code: i.currency_code,
        file_url: await resolveAdminUrl(i.file_url),
        issued_at: i.issued_at,
      }))
    );
    return { success: true, message: 'OK', data: paginated(items, total, p.page, p.limit) };
  }

  static async listWithdrawals(p: WithdrawalListParams): Promise<ServiceResponse> {
    const where: Prisma.WithdrawalRequestWhereInput = {};
    if (p.status) where.status = p.status as any;
    if (p.created) where.created_at = p.created;

    const [rows, total] = await Promise.all([
      prisma.withdrawalRequest.findMany({
        where,
        include: {
          user: { select: userCardSelect },
          withdrawal_method: { select: { id: true } },
          billing_transaction: { select: { unique_id: true, amount: true } },
        },
        orderBy: { withdrawal_trigger_at: 'desc' },
        skip: p.skip,
        take: p.limit,
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
    return { success: true, message: 'OK', data: paginated(items, total, p.page, p.limit) };
  }

  static async updateWithdrawalStatus(
    id: number,
    body: { status?: unknown; error_message?: unknown }
  ): Promise<ServiceResponse> {
    const status = body.status as string;
    const error_message = body.error_message as string | undefined;
    const valid = ['pending', 'processing', 'completed', 'failed'];
    if (!valid.includes(status)) {
      return { success: false, message: `status must be one of ${valid.join(', ')}`, statusCode: 400 };
    }

    const w = await prisma.withdrawalRequest.update({
      where: { id },
      data: {
        status: status as any,
        processed_at: status === 'completed' || status === 'failed' ? new Date() : null,
        error_message: status === 'failed' ? error_message ?? null : null,
      },
    });
    return { success: true, message: 'Withdrawal status updated', data: { id: w.id, status: w.status } };
  }

  /**
   * Record a refund against an existing payment transaction.
   * NOTE: this records the ledger entry + audit only. The actual money movement
   * (Razorpay refund) is handled by the main API's payment integration.
   */
  static async recordRefund(
    body: { transactionUniqueId?: unknown; amount?: unknown; reason?: unknown },
    adminId: number
  ): Promise<ServiceResponse> {
    const transactionUniqueId = body.transactionUniqueId as string | undefined;
    const amount = body.amount;
    const reason = body.reason as string | undefined;
    if (!transactionUniqueId) return { success: false, message: 'transactionUniqueId is required', statusCode: 400 };

    const original = await prisma.billingTransaction.findUnique({ where: { unique_id: transactionUniqueId } });
    if (!original) return { success: false, message: 'Original transaction not found', statusCode: 404 };

    const refundAmount = amount != null ? Number(amount) : Number(original.amount);

    const refund = await prisma.billingTransaction.create({
      data: {
        actor_type: 'Admin',
        actor_id: adminId,
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
        razorpay_payment_id: original.razorpay_payment_id,
        razorpay_order_id: original.razorpay_order_id,
      },
    });

    return {
      success: true,
      message: 'Refund recorded',
      data: { id: refund.id, unique_id: refund.unique_id, originalId: original.id, refundAmount },
    };
  }
}
