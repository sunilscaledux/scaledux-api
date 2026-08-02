import Razorpay from 'razorpay';
import razorpayConfig from '@config/razorpay';
import { prisma } from '@services/prismaService';
import { Log } from '@services/loggerService';
import { ServiceResponse } from '@utils/ApiResponse';
import { userCard, userCardSelect } from '@admin/utils/format';
import { buildMeta } from '@admin/utils/pagination';

const razorpay: any =
  razorpayConfig.key_id && razorpayConfig.key_secret
    ? new Razorpay({ key_id: razorpayConfig.key_id, key_secret: razorpayConfig.key_secret })
    : null;

/** Razorpay's max page size for GET /transfers. */
const RZP_PAGE = 100;
/** Stop sweeping after this many transfers; the response flags the truncation. */
const MAX_SCAN = 1000;

const paise = (v?: number | null) => (v == null ? null : Number(v) / 100);
const unix = (v?: number | null) => (v ? new Date(v * 1000) : null);

export interface TransferListParams {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  status?: string;
  created?: { gte?: Date; lte?: Date } | undefined;
}

/**
 * Razorpay Route transfers. Razorpay is the source of truth here (status,
 * hold, settlement); our DB only adds who the linked account belongs to and
 * which billing transaction the transfer came from.
 */
export class TransferService {
  /** Sweep GET /transfers page by page, bounded by MAX_SCAN. */
  private static async fetchAll(created?: { gte?: Date; lte?: Date }) {
    const query: Record<string, number> = { count: RZP_PAGE };
    if (created?.gte) query.from = Math.floor(created.gte.getTime() / 1000);
    if (created?.lte) query.to = Math.floor(created.lte.getTime() / 1000);

    const all: any[] = [];
    let truncated = false;
    for (let skip = 0; skip < MAX_SCAN; skip += RZP_PAGE) {
      const res = await razorpay.transfers.all({ ...query, skip });
      const items: any[] = res?.items ?? [];
      all.push(...items);
      if (items.length < RZP_PAGE) break;
      if (all.length >= MAX_SCAN) {
        truncated = true;
        break;
      }
    }
    return { all, truncated };
  }

  /** Resolve recipient acc_xxx ids to the user (and bank profile) they belong to. */
  private static async attachAccounts(recipients: string[]) {
    if (!recipients.length) return new Map<string, any>();
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { razorpay_account_id: { in: recipients } },
          { razorpay_agency_account_id: { in: recipients } },
        ],
      },
      select: {
        ...userCardSelect,
        razorpay_account_id: true,
        razorpay_agency_account_id: true,
        show_as_agency: true,
        bankInformation: {
          select: { entity_type: true, razorpay_activation_status: true, verification_status: true },
        },
      },
    });

    const map = new Map<string, any>();
    for (const u of users) {
      const bank = (entity: string) => u.bankInformation.find((b) => b.entity_type === entity);
      if (u.razorpay_account_id && recipients.includes(u.razorpay_account_id)) {
        map.set(u.razorpay_account_id, { user: userCard(u), account_type: 'individual', bank: bank('INDIVIDUAL') });
      }
      if (u.razorpay_agency_account_id && recipients.includes(u.razorpay_agency_account_id)) {
        map.set(u.razorpay_agency_account_id, { user: userCard(u), account_type: 'agency', bank: bank('AGENCY') });
      }
    }
    return map;
  }

  /** Map trf_xxx back to the billing transaction that produced it. */
  private static async attachTransactions(transferIds: string[]) {
    if (!transferIds.length) return new Map<string, any>();
    const rows = await prisma.billingTransaction.findMany({
      where: { razorpay_transfer_id: { in: transferIds } },
      select: {
        razorpay_transfer_id: true,
        unique_id: true,
        type: true,
        status: true,
        description: true,
        subject_type: true,
        subject_id: true,
        on_hold: true,
      },
    });
    return new Map(rows.map((r) => [r.razorpay_transfer_id as string, r]));
  }

  /** Shape one Razorpay transfer for the UI, with whatever our DB knows about it. */
  private static present(t: any, accounts: Map<string, any>, transactions: Map<string, any>) {
    const acc = accounts.get(t.recipient) ?? null;
    const tx = transactions.get(t.id) ?? null;
    return {
      id: t.id,
      recipient: t.recipient,
      source: t.source ?? null,
      amount: paise(t.amount),
      amount_reversed: paise(t.amount_reversed),
      fees: paise(t.fees),
      tax: paise(t.tax),
      currency: t.currency ?? 'INR',
      status: t.status,
      settlement_status: t.settlement_status ?? null,
      on_hold: !!t.on_hold,
      on_hold_until: unix(t.on_hold_until),
      recipient_settlement_id: t.recipient_settlement_id ?? null,
      error: t.error?.description ?? null,
      created_at: unix(t.created_at),
      processed_at: unix(t.processed_at),
      account: acc
        ? {
            type: acc.account_type,
            activation_status: acc.bank?.razorpay_activation_status ?? null,
            verification_status: acc.bank?.verification_status ?? null,
          }
        : null,
      user: acc?.user ?? null,
      transaction: tx
        ? {
            unique_id: tx.unique_id,
            type: tx.type,
            status: tx.status,
            description: tx.description,
            subject_type: tx.subject_type,
            subject_id: tx.subject_id,
            on_hold: tx.on_hold,
          }
        : null,
    };
  }

  /** One transfer, read live so status/hold/settlement are current. */
  static async getTransfer(id: string): Promise<ServiceResponse> {
    if (!razorpay) {
      return { success: false, message: 'Razorpay is not configured on this environment', statusCode: 503 };
    }
    let transfer: any;
    try {
      transfer = await razorpay.transfers.fetch(id);
    } catch (err: any) {
      const message = err?.error?.description || err?.message || 'Failed to fetch the transfer from Razorpay';
      Log.error('Admin: Razorpay transfer fetch failed', { err: message, id });
      return { success: false, message, statusCode: err?.statusCode === 400 ? 404 : 502 };
    }

    const [accounts, transactions] = await Promise.all([
      this.attachAccounts(transfer.recipient ? [transfer.recipient] : []),
      this.attachTransactions([transfer.id]),
    ]);
    return { success: true, message: 'OK', data: this.present(transfer, accounts, transactions) };
  }

  static async listTransfers(p: TransferListParams): Promise<ServiceResponse> {
    if (!razorpay) {
      return { success: false, message: 'Razorpay is not configured on this environment', statusCode: 503 };
    }

    let all: any[];
    let truncated: boolean;
    try {
      ({ all, truncated } = await this.fetchAll(p.created));
    } catch (err: any) {
      const message = err?.error?.description || err?.message || 'Failed to fetch transfers from Razorpay';
      Log.error('Admin: Razorpay transfer list failed', { err: message });
      return { success: false, message, statusCode: 502 };
    }

    const [accounts, transactions] = await Promise.all([
      this.attachAccounts([...new Set(all.map((t) => t.recipient).filter(Boolean))] as string[]),
      this.attachTransactions([...new Set(all.map((t) => t.id).filter(Boolean))] as string[]),
    ]);

    const rows = all.map((t) => this.present(t, accounts, transactions));

    const search = p.search?.toLowerCase();
    const filtered = rows.filter((r) => {
      if (p.status && r.status !== p.status) return false;
      if (!search) return true;
      return [r.id, r.recipient, r.source, r.transaction?.unique_id, r.user?.name, r.user?.email]
        .some((v) => v && String(v).toLowerCase().includes(search));
    });

    const items = filtered.slice(p.skip, p.skip + p.limit);
    return {
      success: true,
      message: 'OK',
      data: {
        items,
        meta: buildMeta(filtered.length, p.page, p.limit),
        truncated,
        unlinked: filtered.filter((r) => !r.transaction).length,
      },
    };
  }
}
