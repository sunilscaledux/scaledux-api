import { Request, Response } from 'express';
import prisma from '@services/prismaService';

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

const STATIC_PAGES = [
  { path: '/login',             changefreq: 'monthly', priority: '0.5' },
  { path: '/signup',            changefreq: 'monthly', priority: '0.5' },
  { path: '/forgot-password',   changefreq: 'monthly', priority: '0.3' },
  { path: '/mentors',           changefreq: 'daily',   priority: '0.9' },
  { path: '/service-providers', changefreq: 'daily',   priority: '0.9' },
  { path: '/investors',         changefreq: 'daily',   priority: '0.9' },
  { path: '/project',           changefreq: 'daily',   priority: '0.8' },
  { path: '/fees',              changefreq: 'monthly', priority: '0.5' },
  { path: '/privacy-policy',    changefreq: 'yearly',  priority: '0.3' },
  { path: '/terms',             changefreq: 'yearly',  priority: '0.3' },
];

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function buildUrl(
  loc: string,
  lastmod: string,
  changefreq: string,
  priority: string,
): string {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

export async function getSitemap(_req: Request, res: Response) {
  const today = formatDate(new Date());

  const [users, servicePackages, mentorPackages] = await Promise.all([
    prisma.user.findMany({
      where: { status: 1, is_deactivated: false, unique_id: { not: null } },
      select: { unique_id: true, role: true, updated_at: true },
    }),
    prisma.servicePackage.findMany({
      where: { status: 'PUBLISHED' },
      select: { unique_id: true, updated_at: true },
    }),
    prisma.mentorPackage.findMany({
      where: { status: 'PUBLISHED' },
      select: { unique_id: true, updated_at: true },
    }),
  ]);

  const urls: string[] = [];

  // Static pages
  for (const page of STATIC_PAGES) {
    urls.push(buildUrl(`${FRONTEND_URL}${page.path}`, today, page.changefreq, page.priority));
  }

  // Public user profiles
  for (const user of users) {
    if (!user.unique_id) continue;
    const lastmod = formatDate(user.updated_at);
    urls.push(buildUrl(`${FRONTEND_URL}/profile/${user.unique_id}`, lastmod, 'weekly', '0.7'));

    // Investor profiles get an extra URL
    if (user.role === 'investor') {
      urls.push(buildUrl(`${FRONTEND_URL}/investors/${user.unique_id}`, lastmod, 'weekly', '0.7'));
    }
  }

  // Service packages
  for (const pkg of servicePackages) {
    urls.push(buildUrl(
      `${FRONTEND_URL}/service-package/${pkg.unique_id}`,
      formatDate(pkg.updated_at),
      'weekly',
      '0.6',
    ));
  }

  // Mentor packages
  for (const pkg of mentorPackages) {
    urls.push(buildUrl(
      `${FRONTEND_URL}/mentor-package/${pkg.unique_id}`,
      formatDate(pkg.updated_at),
      'weekly',
      '0.6',
    ));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(xml);
}
