import { Request, Response } from 'express';
import { prisma } from '@services/prismaService';
import { ApiResponse } from '@utils/ApiResponse';

export async function getStats(_req: Request, res: Response) {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers30,
    deactivatedUsers,
    totalProjects,
    activeProjects,
    totalProposals,
    hiredProposals,
    totalBookings,
    pendingIdentity,
    pendingAgency,
    pendingReports,
    pendingWithdrawals,
    gmv,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { created_at: { gte: since30 } } }),
    prisma.user.count({ where: { is_deactivated: true } }),
    prisma.founderProject.count({ where: { deleted_at: null } }),
    prisma.founderProject.count({ where: { deleted_at: null, status: { in: ['PUBLISHED', 'ACTIVE', 'OPEN'] } } }),
    prisma.proposal.count({ where: { is_draft: false } }),
    prisma.proposal.count({ where: { status: 'HIRED' } }),
    prisma.booking.count(),
    prisma.identityVerification.count({ where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } } }),
    prisma.agencyVerification.count({ where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } } }),
    prisma.reportSpam.count({ where: { status: { in: ['PENDING', 'REVIEWING'] } } }),
    prisma.withdrawalRequest.count({ where: { status: { in: ['pending', 'processing'] } } }),
    prisma.billingTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'payment', status: 'completed' },
    }),
  ]);

  return ApiResponse.success(res, {
    users: { total: totalUsers, new30d: newUsers30, deactivated: deactivatedUsers },
    projects: { total: totalProjects, active: activeProjects },
    proposals: { total: totalProposals, hired: hiredProposals },
    bookings: { total: totalBookings },
    gmv: Number(gmv._sum.amount ?? 0),
    queues: {
      pendingIdentity,
      pendingAgency,
      pendingReports,
      pendingWithdrawals,
    },
  });
}

export async function getCharts(_req: Request, res: Response) {
  // Last 6 months of signups & revenue.
  const usersByMonth = await prisma.$queryRawUnsafe<Array<{ month: string; count: bigint }>>(
    `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::bigint AS count
     FROM scd_users
     WHERE created_at >= (date_trunc('month', now()) - interval '5 months')
     GROUP BY 1 ORDER BY 1`
  );

  const revenueByMonth = await prisma.$queryRawUnsafe<Array<{ month: string; total: number }>>(
    `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, COALESCE(SUM(amount),0)::float AS total
     FROM scd_billing_transactions
     WHERE type = 'payment' AND status = 'completed'
       AND created_at >= (date_trunc('month', now()) - interval '5 months')
     GROUP BY 1 ORDER BY 1`
  );

  return ApiResponse.success(res, {
    usersByMonth: usersByMonth.map((r) => ({ month: r.month, count: Number(r.count) })),
    revenueByMonth: revenueByMonth.map((r) => ({ month: r.month, total: Number(r.total) })),
  });
}
