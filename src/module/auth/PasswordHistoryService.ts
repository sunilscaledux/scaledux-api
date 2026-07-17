import bcrypt from 'bcrypt';
import { Request } from 'express';
import { prisma } from '@services/prismaService';
import { Log } from '@services/loggerService';

export type PasswordChangeSource = 'register' | 'set' | 'update' | 'reset';

/**
 * Check whether `newPlainPassword` matches the user's current password or any
 * of their historical passwords. Used to block reuse on update / reset / set.
 *
 * Returns `{ ok: true }` on success, or `{ ok: false, message }` if the
 * password has been used before.
 */
export async function assertNotReused(
  userId: number,
  currentHash: string | null | undefined,
  newPlainPassword: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  // Reuse of the current password is the most common case, fast path.
  if (currentHash) {
    const matchesCurrent = await bcrypt.compare(newPlainPassword, currentHash);
    if (matchesCurrent) {
      return {
        ok: false,
        message: 'New password must be different from your current password.',
      };
    }
  }

  // bcrypt.compare is the only valid comparison; we cannot SQL-filter by hash.
  // History tables are small per-user so loading them is cheap.
  const history = await prisma.passwordHistory.findMany({
    where: { user_id: userId },
    select: { password: true },
    orderBy: { created_at: 'desc' },
  });

  for (const entry of history) {
    const matches = await bcrypt.compare(newPlainPassword, entry.password);
    if (matches) {
      return {
        ok: false,
        message: 'You cannot reuse a previous password. Please choose a new one.',
      };
    }
  }

  return { ok: true };
}

/**
 * Append a password change to the audit log. Best-effort, failure here must
 * not roll back the password update itself (the user's auth state is already
 * changed), so we log and swallow.
 */
export async function recordPasswordChange(params: {
  userId: number;
  hashedPassword: string;
  source: PasswordChangeSource;
  req?: Request;
}): Promise<void> {
  try {
    const { userId, hashedPassword, source, req } = params;
    const ip = req
      ? (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        null
      : null;
    const userAgent = req
      ? (req.headers['user-agent'] as string | undefined) || null
      : null;

    await prisma.passwordHistory.create({
      data: {
        user_id: userId,
        password: hashedPassword,
        source,
        ip_address: ip ? ip.slice(0, 64) : null,
        user_agent: userAgent,
      },
    });
  } catch (error) {
    Log.error('PasswordHistory record failed', { error, userId: params.userId });
  }
}
