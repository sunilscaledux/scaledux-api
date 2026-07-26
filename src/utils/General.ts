
import crypto from 'crypto'
import { appConfig } from '@config/app'

/** Letters and single spaces only — blocks numbers, tags and special characters. */
export const FULL_NAME_REGEX = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;

/** Normalize a full name: trim, collapse spaces, capitalize each word's first letter. */
export function normalizeFullName(fullName: string): string {
  return fullName
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Split a full name: first word → first_name, remaining words → last_name. */
export function splitFullName(fullName: string): { first_name: string; last_name: string | null } {
  const words = normalizeFullName(fullName).split(' ').filter(Boolean);
  const first_name = words.shift() ?? '';
  return { first_name, last_name: words.length ? words.join(' ') : null };
}

/** Display name for API: "Scaledux user" when deactivated, else first + middle + last name.
 *  When maskLastName is true, last name is masked to the initial of its last word
 *  (e.g. "Ashok Kumar Mehta" → "Ashok M.") and middle name is hidden. */
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
  const lastWord = user.last_name?.trim().split(/\s+/).pop() ?? '';
  return {
    firstName,
    lastName: user.last_name ? (maskLastName ? `${lastWord.charAt(0).toUpperCase()}.` : user.last_name) : null,
  };
}

/** Mutate a user-like object so first_name / last_name use the masked display name.
 *  Handy for API responses that spread raw DB rows into JSON. */
export function maskUserName<T extends { first_name: string; last_name?: string | null }>(user: T): T {
  const { firstName, lastName } = getDisplayName(user, { maskLastName: true });
  user.first_name = firstName;
  (user as any).last_name = lastName ?? '';
  return user;
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

  return appConfig.appEnv === 'local' ? '123456' : otp;
};

/**
 * Canonical form of an email address: trimmed and lowercased.
 *
 * Addresses are stored and looked up in this form only. The `email` column is a
 * plain unique text column, so its index is case-sensitive and cannot collapse
 * `A@x.com` and `a@x.com` on its own. Normalizing on every read and write is
 * what keeps them a single identity.
 */
export const normalizeEmail = <T extends string | null | undefined>(
  email: T
): T extends string ? string : null =>
  (email ? email.trim().toLowerCase() : null) as T extends string ? string : null;

/** Country code assumed for bare local numbers. The UI only offers India today. */
export const DEFAULT_PHONE_COUNTRY_CODE = "+91";

/**
 * Canonical (E.164) form of a phone number: +<country code><subscriber number>.
 *
 * `phone` is a single unique column holding the full international number, so a
 * bare "9606626500" and "+919606626500" must not both be storable. They are the
 * same person and the unique index cannot tell. Everything is folded to the +91…
 * form on every read and write.
 *
 * A 10-digit local number is assumed to be Indian, matching the only country code
 * the UI offers. Revisit this when a second country ships.
 */
export const normalizePhone = (phone?: string | null): string | null => {
  if (!phone) return null;

  const trimmed = phone.trim();
  const isInternational = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) return null;
  if (isInternational) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.length === 10) return `${DEFAULT_PHONE_COUNTRY_CODE}${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) {
    return `${DEFAULT_PHONE_COUNTRY_CODE}${digits.slice(1)}`;
  }
  // 11+ digits without a '+' already carry a country code (e.g. 919606626500).
  return `+${digits}`;
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
  // Accept 10-digit local numbers and 10-15 digit international numbers (with optional + prefix)
  const isPhone = !isEmail && /^\+?\d{10,15}$/.test(incoming.trim());

  if (isEmail) {
    return { email: normalizeEmail(incoming), phone: null };
  } else if (isPhone) {
    return { email: null, phone: normalizePhone(incoming) };
  } else {
    // Keep as-is and let Joi raise validation error
    return { email: normalizeEmail(incoming), phone: null };
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

/** Fetch a user's masked display name by ID. Returns "Someone" if not found. */
export async function getUserFullName(userId: number): Promise<string> {
  const { prisma } = await import('../services/prismaService');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { first_name: true, last_name: true }
  });
  if (!user) return 'Someone';
  const { firstName, lastName } = getDisplayName(user, { maskLastName: true });
  return [firstName, lastName].filter(Boolean).join(' ');
}

/** Build masked display name string from a user-like object. */
export function getMaskedName(user: { first_name: string; last_name?: string | null }): string {
  const { firstName, lastName } = getDisplayName(user, { maskLastName: true });
  return [firstName, lastName].filter(Boolean).join(' ');
}