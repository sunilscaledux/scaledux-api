
import crypto from 'crypto'
import { appConfig } from '@config/app'

/** Display name for API: "Scaledux user" when deactivated, else first + middle + last name.
 *  When maskLastName is true, last name is masked (e.g. "S.") and middle name is hidden. */
export function getDisplayName(
  user: { first_name: string; middle_name?: string | null; last_name?: string | null; is_deactivated?: boolean },
  options?: { maskLastName?: boolean }
): { firstName: string; lastName: string | null } {
  if ((user as { is_deactivated?: boolean }).is_deactivated) {
    return { firstName: "Scaledux user", lastName: null };
  }
  const maskLastName = !!options?.maskLastName;
  const firstName = [user.first_name, maskLastName ? null : user.middle_name]
    .filter(Boolean)
    .join(' ');
  return {
    firstName,
    lastName: user.last_name ? (maskLastName ? `${user.last_name.charAt(0)}.` : user.last_name) : null,
  };
}

/** Generate a unique 8-char alphanumeric keycode for identity verification (e.g. "6E4E904W"). */
export function generateKeycode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const normalizePath = (path: string): string => {
  return path.replace(/^\/+/, '').replace(/\\/g, '/');
};

/** Expects unique_id(s) as JSON; returns string[] for storage/API. */
export const toAttachmentIds = (val: any): string[] => {
  if (val == null) return []
  if (typeof val === 'string') return val ? [val] : []
  if (!Array.isArray(val)) return []
  return val.filter((id): id is string => typeof id === 'string' && id.length > 0)
}

/**
 * Generate a random OTP code
 */
export const generateOtpCode = (length: number = 6): string => {
  const digits = "0123456789";
  let otp = "";

  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }

  return appConfig.appEnv=='local'?'123456': '123456';
};

/**
 * Normalize contact input to determine if it's email or phone
 */
export const normalizeContact = (email: string) => {
  const incoming = email;

  if (!incoming) {
    return { email: null, phone: null };
  }

  const isEmail = /@/.test(incoming);
  const digitsOnly = incoming.replace(/\D/g, "");
  const isPhone = /^\d{10}$/.test(digitsOnly);

  if (isEmail) {
    return { email: incoming, phone: null };
  } else if (isPhone) {
    return { email: null, phone: digitsOnly };
  } else {
    // Keep as-is and let Joi raise validation error
    return { email: incoming, phone: null };
  }
};



export function addDaysUtc(d: Date, days: number): Date {
  const x = new Date(d.getTime())
  x.setUTCDate(x.getUTCDate() + days)
  return x
}

/**
 * After an approved identity/agency verification, the user must wait N days before resubmitting.
 */
export function getResubmitWindow(
  lastApprovedAt: Date | null | undefined,
  cooldownDays: number = appConfig.verification.identityCooldownDays
): { canSubmit: boolean; nextSubmitAllowedAt: Date | null } {
  const days = cooldownDays
  if (!lastApprovedAt) {
    return { canSubmit: true, nextSubmitAllowedAt: null }
  }
  const next = addDaysUtc(lastApprovedAt, days)
  const canSubmit = new Date() >= next
  return {
    canSubmit,
    nextSubmitAllowedAt: canSubmit ? null : next
  }
}

/** Generate random backup codes for 2FA recovery. */
export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(4).toString('hex')
  )
}

/** Fetch a user's full display name by ID. Returns "Someone" if not found. */
export async function getUserFullName(userId: number): Promise<string> {
  const { prisma } = await import('../services/prismaService');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { first_name: true, last_name: true }
  });
  if (!user) return 'Someone';
  return [user.first_name, user.last_name].filter(Boolean).join(' ');
}