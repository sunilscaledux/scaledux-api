import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { paginated } from '@admin/utils/pagination';
import { userCard, userCardSelect, userName, resolveImageRef } from '@admin/utils/format';

export interface UserListParams {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  role?: string;
  status?: string;
  verification?: string;
  created?: Prisma.DateTimeFilter | undefined;
}

export interface UserTransactionsParams {
  uniqueId: string;
  page: number;
  limit: number;
  skip: number;
  search: string;
  creditsOnly: boolean;
  created?: Prisma.DateTimeFilter | undefined;
}

export class UserService {
  static async list(p: UserListParams): Promise<ServiceResponse> {
    const where: Prisma.UserWhereInput = {};
    if (p.role) where.role = p.role;
    if (p.status === 'active') where.status = 1;
    if (p.status === 'suspended') where.status = 0;
    if (p.status === 'deactivated') where.is_deactivated = true;
    if (p.verification) where.identity_verification_status = p.verification;
    if (p.search) {
      where.OR = [
        { first_name: { contains: p.search, mode: 'insensitive' } },
        { last_name: { contains: p.search, mode: 'insensitive' } },
        { email: { contains: p.search, mode: 'insensitive' } },
        { phone: { contains: p.search, mode: 'insensitive' } },
      ];
    }
    if (p.created) where.created_at = p.created;

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          ...userCardSelect,
          created_at: true,
          is_deactivated: true,
          identity_verification_status: true,
          agency_verification_status: true,
          avg_rating: true,
        },
        orderBy: { created_at: 'desc' },
        skip: p.skip,
        take: p.limit,
      }),
      prisma.user.count({ where }),
    ]);

    const items = rows.map((u) => ({
      ...userCard(u),
      created_at: u.created_at,
      is_deactivated: u.is_deactivated,
      identity_verification_status: u.identity_verification_status,
      agency_verification_status: u.agency_verification_status,
      avg_rating: Number(u.avg_rating ?? 0),
    }));

    return { success: true, message: 'OK', data: paginated(items, total, p.page, p.limit) };
  }

  static async getOne(uniqueId: string): Promise<ServiceResponse> {
    const user = await prisma.user.findUnique({
      where: { unique_id: uniqueId },
      include: {
        personalInfo: true,
        companyProfile: true,
        wallet: true,
        preference: true,
      },
    });
    if (!user) return { success: false, message: 'User not found', statusCode: 404 };

    const [projects, proposals, bookingsAsMentor, bookingsAsUser, reportsReceived, reviewsReceived] =
      await Promise.all([
        prisma.founderProject.count({ where: { user_id: user.id, deleted_at: null } }),
        prisma.proposal.count({ where: { provider_id: user.id, is_draft: false } }),
        prisma.booking.count({ where: { mentor_id: user.id } }),
        prisma.booking.count({ where: { user_id: user.id } }),
        prisma.reportSpam.count({ where: { reported_user_id: user.id } }),
        prisma.review.count({ where: { review_to_id: user.id } }),
      ]);

    const { password, backup_codes, ...safe } = user as any;

    return {
      success: true,
      message: 'OK',
      data: {
        ...safe,
        name: userName(user),
        avatar: resolveImageRef(user.personalInfo?.profileImage ?? null),
        cover: resolveImageRef(user.personalInfo?.coverImage ?? null),
        companyProfile: user.companyProfile
          ? {
              ...user.companyProfile,
              profileImage: resolveImageRef((user.companyProfile as any).profileImage ?? null),
              coverImage: resolveImageRef((user.companyProfile as any).coverImage ?? null),
            }
          : null,
        wallet: user.wallet
          ? {
              balance: Number(user.wallet.wallet_amount),
              total_earning: Number(user.wallet.total_earning),
              total_withdrawal: Number(user.wallet.total_withdrawal),
              pending: Number(user.wallet.pending_amount),
            }
          : null,
        stats: { projects, proposals, bookingsAsMentor, bookingsAsUser, reportsReceived, reviewsReceived },
      },
    };
  }

  static async updateStatus(id: number, status: unknown): Promise<ServiceResponse> {
    if (status !== 0 && status !== 1) {
      return { success: false, message: 'status must be 0 (suspend) or 1 (activate)', statusCode: 400 };
    }

    const user = await prisma.user.update({ where: { id }, data: { status } });
    return { success: true, message: 'User status updated', data: { id: user.id, status: user.status } };
  }

  static async setDeactivation(
    id: number,
    deactivate: unknown,
    reason: unknown
  ): Promise<ServiceResponse> {
    const data = deactivate
      ? {
          is_deactivated: true,
          deactivated_at: new Date(),
          deactivated_reason: reason ?? 'Deactivated by admin',
          status: 0,
        }
      : { is_deactivated: false, deactivated_at: null, deactivated_reason: null, status: 1 };

    const user = await prisma.user.update({ where: { id }, data });
    return { success: true, message: 'Updated', data: { id: user.id, is_deactivated: user.is_deactivated } };
  }

  static async updateRole(id: number, role: unknown): Promise<ServiceResponse> {
    if (!role || typeof role !== 'string') {
      return { success: false, message: 'role is required', statusCode: 400 };
    }

    const user = await prisma.user.update({ where: { id }, data: { role } });
    return { success: true, message: 'User role updated', data: { id: user.id, role: user.role } };
  }

  static async impersonate(id: number): Promise<ServiceResponse> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return { success: false, message: 'User not found', statusCode: 404 };

    // Same app as the main API. Reuse its JWT secret directly.
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return {
        success: false,
        message: 'Impersonation is not configured (JWT_SECRET missing)',
        statusCode: 500,
      };
    }

    // Mint a token shaped like the main API's auth_token.
    const token = jwt.sign(
      {
        id: user.id,
        unique_id: user.unique_id,
        email: user.email,
        role: user.role,
        email_verified_at: user.email_verified_at,
      },
      secret,
      { expiresIn: '1h' }
    );

    const frontend = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    return {
      success: true,
      message: 'Impersonation token generated. Set as auth_token cookie on the main app.',
      data: { token, frontendUrl: frontend, expiresInSeconds: 3600 },
    };
  }

  /** A user's billing transactions (as payer or receiver) + earnings/wallet summary. */
  static async getTransactions(p: UserTransactionsParams): Promise<ServiceResponse> {
    const user = await prisma.user.findUnique({
      where: { unique_id: p.uniqueId },
      select: { id: true, wallet: true },
    });
    if (!user) return { success: false, message: 'User not found', statusCode: 404 };

    const where: Prisma.BillingTransactionWhereInput = {
      OR: p.creditsOnly
        ? [{ to_type: 'User', to_id: user.id }]
        : [
            { from_type: 'User', from_id: user.id },
            { to_type: 'User', to_id: user.id },
          ],
    };
    if (p.created) where.created_at = p.created;
    if (p.search) {
      where.AND = [
        {
          OR: [
            { unique_id: { contains: p.search } },
            { description: { contains: p.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const invoiceSelect = { select: { file_url: true, invoice_number: true } };
    const [rows, total] = await Promise.all([
      prisma.billingTransaction.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: p.skip,
        take: p.limit,
        include: { payer_invoice: invoiceSelect, receiver_invoice: invoiceSelect, invoice_a: invoiceSelect },
      }),
      prisma.billingTransaction.count({ where }),
    ]);

    // Resolve the counterparty (the "client" column) for each row.
    const otherIds = new Set<number>();
    for (const t of rows) {
      const other = t.from_id === user.id ? t.to_id : t.from_id;
      if (other) otherIds.add(other);
    }
    const others = otherIds.size
      ? await prisma.user.findMany({ where: { id: { in: [...otherIds] } }, select: userCardSelect })
      : [];
    const nameMap = new Map(others.map((u) => [u.id, userName(u)]));

    const items = rows.map((t) => {
      const isCredit = t.to_type === 'User' && t.to_id === user.id;
      const otherId = t.from_id === user.id ? t.to_id : t.from_id;
      return {
        id: t.id,
        unique_id: t.unique_id,
        type: t.type,
        status: t.status,
        sender_status: t.sender_status,
        receiver_status: t.receiver_status,
        amount: Number(t.amount),
        payer_amount: t.payer_amount != null ? Number(t.payer_amount) : null,
        receiver_amount: t.receiver_amount != null ? Number(t.receiver_amount) : null,
        direction: isCredit ? 'credit' : 'debit',
        description: t.description,
        subject_type: t.subject_type,
        from_id: t.from_id,
        to_id: t.to_id,
        client: nameMap.get(otherId) ?? null,
        created_at: t.created_at,
        invoices: [
          t.payer_invoice?.file_url && { type: 'C', label: 'Payment Receipt', url: resolveImageRef(t.payer_invoice.file_url), number: t.payer_invoice.invoice_number },
          t.receiver_invoice?.file_url && { type: 'B', label: 'Earnings Invoice', url: resolveImageRef(t.receiver_invoice.file_url), number: t.receiver_invoice.invoice_number },
          t.invoice_a?.file_url && { type: 'A', label: 'Service Invoice', url: resolveImageRef(t.invoice_a.file_url), number: t.invoice_a.invoice_number },
        ].filter(Boolean),
      };
    });

    const wallet = user.wallet
      ? {
          balance: Number(user.wallet.wallet_amount),
          total_earning: Number(user.wallet.total_earning),
          total_withdrawal: Number(user.wallet.total_withdrawal),
          pending: Number(user.wallet.pending_amount),
        }
      : null;

    return {
      success: true,
      message: 'OK',
      data: {
        userId: user.id,
        wallet,
        transactions: paginated(items, total, p.page, p.limit),
      },
    };
  }
}
