/**
 * Keep KYC and payment identifiers out of the logs.
 * Verification responses carry account numbers, PAN, Aadhaar UIDs and photos;
 * none of it belongs in Docker logs, where it survives outside the database.
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
