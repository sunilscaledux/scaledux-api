import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { prisma } from '@services/prismaService';
import { ApiResponse } from '@utils/ApiResponse';
import { getPageParams, paginated, getDateRange } from '@admin/utils/pagination';
import { userCard, userCardSelect, userName } from '@admin/utils/format';
import { resolveFileUrl } from '@admin/utils/url';
import { auditFromReq } from '@admin/services/auditService';

export async function listUsers(req: Request, res: Response) {
  const { page, limit, skip, search } = getPageParams(req);
  const role = req.query.role as string | undefined;
  const status = req.query.status as string | undefined;
  const verification = req.query.verification as string | undefined; // identity status

  const where: Prisma.UserWhereInput = {};
  if (role) where.role = role;
  if (status === 'active') where.status = 1;
  if (status === 'suspended') where.status = 0;
  if (status === 'deactivated') where.is_deactivated = true;
  if (verification) where.identity_verification_status = verification;
  if (search) {
    where.OR = [
      { first_name: { contains: search, mode: 'insensitive' } },
      { last_name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }
  const created = getDateRange(req);
  if (created) where.created_at = created;

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
      skip,
      take: limit,
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

  return ApiResponse.success(res, paginated(items, total, page, limit));
}

export async function getUser(req: Request, res: Response) {
  const { uniqueId } = req.params;
  const user = await prisma.user.findUnique({
    where: { unique_id: uniqueId },
    include: {
      personalInfo: true,
      companyProfile: true,
      wallet: true,
      preference: true,
    },
  });
  if (!user) return ApiResponse.notFound(res, 'User not found');

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

  return ApiResponse.success(res, {
    ...safe,
    name: userName(user),
    avatar: resolveFileUrl(user.personalInfo?.profileImage ?? null),
    cover: resolveFileUrl(user.personalInfo?.coverImage ?? null),
    wallet: user.wallet
      ? {
          balance: Number(user.wallet.wallet_amount),
          total_earning: Number(user.wallet.total_earning),
          total_withdrawal: Number(user.wallet.total_withdrawal),
          pending: Number(user.wallet.pending_amount),
        }
      : null,
    stats: { projects, proposals, bookingsAsMentor, bookingsAsUser, reportsReceived, reviewsReceived },
  });
}

export async function updateStatus(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid user id', null, 400);

  const { status } = req.body || {};
  if (status !== 0 && status !== 1) {
    return ApiResponse.error(res, 'status must be 0 (suspend) or 1 (activate)', null, 400);
  }

  const user = await prisma.user.update({ where: { id }, data: { status } });
  await auditFromReq(req, status === 1 ? 'user.activate' : 'user.suspend', {
    entityType: 'User',
    entityId: id,
  });
  return ApiResponse.success(res, { id: user.id, status: user.status }, 'User status updated');
}

export async function setDeactivation(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid user id', null, 400);

  const { deactivate, reason } = req.body || {};
  const data = deactivate
    ? { is_deactivated: true, deactivated_at: new Date(), deactivated_reason: reason ?? 'Deactivated by admin', status: 0 }
    : { is_deactivated: false, deactivated_at: null, deactivated_reason: null, status: 1 };

  const user = await prisma.user.update({ where: { id }, data });
  await auditFromReq(req, deactivate ? 'user.deactivate' : 'user.reactivate', {
    entityType: 'User',
    entityId: id,
    description: reason,
  });
  return ApiResponse.success(res, { id: user.id, is_deactivated: user.is_deactivated }, 'Updated');
}

export async function updateRole(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid user id', null, 400);

  const { role } = req.body || {};
  if (!role || typeof role !== 'string') return ApiResponse.error(res, 'role is required', null, 400);

  const user = await prisma.user.update({ where: { id }, data: { role } });
  await auditFromReq(req, 'user.update_role', { entityType: 'User', entityId: id, metadata: { role } });
  return ApiResponse.success(res, { id: user.id, role: user.role }, 'User role updated');
}

export async function impersonate(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid user id', null, 400);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return ApiResponse.notFound(res, 'User not found');

  // Same app as the main API — reuse its JWT secret directly.
  const secret = process.env.JWT_SECRET;
  if (!secret) return ApiResponse.error(res, 'Impersonation is not configured (JWT_SECRET missing)', null, 500);

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

  await auditFromReq(req, 'user.impersonate', { entityType: 'User', entityId: id });

  const frontend = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  return ApiResponse.success(
    res,
    { token, frontendUrl: frontend, expiresInSeconds: 3600 },
    'Impersonation token generated. Set as auth_token cookie on the main app.'
  );
}

/** A user's billing transactions (as payer or receiver) + earnings/wallet summary. */
export async function getUserTransactions(req: Request, res: Response) {
  const { uniqueId } = req.params;
  const { page, limit, skip } = getPageParams(req);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const creditsOnly = req.query.creditsOnly === 'true';

  const user = await prisma.user.findUnique({
    where: { unique_id: uniqueId },
    select: { id: true, wallet: true },
  });
  if (!user) return ApiResponse.notFound(res, 'User not found');

  const where: Prisma.BillingTransactionWhereInput = {
    OR: creditsOnly
      ? [{ to_type: 'User', to_id: user.id }]
      : [
          { from_type: 'User', from_id: user.id },
          { to_type: 'User', to_id: user.id },
        ],
  };
  const created = getDateRange(req);
  if (created) where.created_at = created;
  if (search) {
    where.AND = [
      {
        OR: [
          { unique_id: { contains: search } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      },
    ];
  }

  const invoiceSelect = { select: { file_url: true, invoice_number: true } };
  const [rows, total] = await Promise.all([
    prisma.billingTransaction.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
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
        t.payer_invoice?.file_url && { type: 'C', label: 'Payment Receipt', url: resolveFileUrl(t.payer_invoice.file_url), number: t.payer_invoice.invoice_number },
        t.receiver_invoice?.file_url && { type: 'B', label: 'Earnings Invoice', url: resolveFileUrl(t.receiver_invoice.file_url), number: t.receiver_invoice.invoice_number },
        t.invoice_a?.file_url && { type: 'A', label: 'Service Invoice', url: resolveFileUrl(t.invoice_a.file_url), number: t.invoice_a.invoice_number },
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

  return ApiResponse.success(res, {
    userId: user.id,
    wallet,
    transactions: paginated(items, total, page, limit),
  });
}
