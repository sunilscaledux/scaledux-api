/**
 * Masking for KYC and payment identifiers, in logs and at rest.
 * Every mask here is idempotent: masking an already-masked value returns it
 * unchanged, so backfills and re-saves can run more than once safely.
 */

/** Last 4 characters only, e.g. 502312345678 -> ****5678. */
export const maskTail = (value?: string | null): string => {
  const v = (value ?? '').trim();
  if (!v) return '';
  if (v.length <= 4) return '****';
  return `****${v.slice(-4)}`;
};

/** Bank code only, e.g. HDFC0001234 -> HDFC*******. */
export const maskIfsc = (value?: string | null): string => {
  const v = (value ?? '').trim();
  if (v.length < 5) return v ? '****' : '';
  return `${v.slice(0, 4)}${'*'.repeat(v.length - 4)}`;
};

/** PAN: keep the first 4 and the trailing check letter, e.g. ABCDE1234F -> ABCD*****F. */
export const maskPan = (value?: string | null): string => {
  const v = (value ?? '').trim().toUpperCase();
  if (!v) return '';
  if (v.length < 6) return '*'.repeat(v.length);
  return v.slice(0, 4) + '*'.repeat(v.length - 5) + v.slice(-1);
};

/**
 * GSTIN: keep the 2-digit state code and the last 2.
 * Characters 3-12 are the holder's PAN, so those are what must go.
 */
export const maskGstin = (value?: string | null): string => {
  const v = (value ?? '').trim().toUpperCase();
  if (!v) return '';
  if (v.length < 6) return '*'.repeat(v.length);
  return v.slice(0, 2) + '*'.repeat(v.length - 4) + v.slice(-2);
};

/** True when a value is already reduced to its masked form. */
export const isMasked = (value?: string | null): boolean =>
  typeof value === 'string' && value.includes('*');

/** Diagnostic keys worth logging from a vendor error body. Everything else is dropped. */
const ERROR_KEYS = ['status', 'code', 'error', 'error_code', 'message', 'detail', 'reason', 'failure_reason'];

/**
 * Reduce a vendor error body to its diagnostic fields.
 * Allowlist, not denylist: an unknown key in a new response shape stays out by default.
 */
export const safeErrorData = (data: any): Record<string, unknown> | string | undefined => {
  if (data == null) return undefined;
  if (typeof data === 'string') return data.slice(0, 300);
  if (typeof data !== 'object') return String(data);

  const out: Record<string, unknown> = {};
  for (const key of ERROR_KEYS) {
    const value = (data as any)[key];
    if (value == null) continue;
    out[key] = typeof value === 'object' ? JSON.stringify(value).slice(0, 300) : value;
  }
  if (Object.keys(out).length === 0) out.keys = Object.keys(data).join(',');
  return out;
};
