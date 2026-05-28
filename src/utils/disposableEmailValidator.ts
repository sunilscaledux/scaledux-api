import disposableEmailDomains from '../data/disposable-email-domains';

/**
 * Checks whether the given email address belongs to a known
 * disposable / temporary email provider.
 *
 * Returns `false` for non-email values (e.g. phone numbers)
 * so it can be safely called on any identifier field.
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false;

  const domain = email.split('@').pop()?.toLowerCase().trim();
  if (!domain) return false;

  return disposableEmailDomains.has(domain);
}
