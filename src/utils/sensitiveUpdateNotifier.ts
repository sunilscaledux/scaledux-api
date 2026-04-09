import { prisma } from '@services/prismaService';
import { emailService } from '@services/emailService';
import { Log } from '@services/loggerService';

/**
 * Fire-and-forget email notification that a sensitive field on a user's
 * account was updated (bank details, tax info, CIN, identity, etc.).
 *
 * Caller supplies the subject and the user-facing message — there is no
 * per-field template. We look up the user's email internally so service
 * callers only need to pass userId + copy.
 *
 * `link` is the destination for the optional "View Details" CTA in the
 * email. If omitted, no button is rendered.
 */
export async function notifySensitiveUpdate(
  userId: number,
  subject: string,
  message: string,
  link?: string,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, first_name: true },
    });

    if (!user?.email) {
      Log.warn('notifySensitiveUpdate: user has no email', { userId });
      return;
    }

    const greeting = user.first_name ? `Hi ${user.first_name},<br/><br/>` : '';
    const footer =
      '<br/><br/>If this wasn\'t you, please secure your account and contact support immediately.';

    await emailService.sendSensitiveUpdateEmail(
      user.email,
      subject,
      `${greeting}${message}${footer}`,
      link,
    );
  } catch (error) {
    Log.error('notifySensitiveUpdate failed', { error, userId });
  }
}
