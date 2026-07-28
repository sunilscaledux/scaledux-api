/** Honorifics and salutations dropped before comparing names. */
const TITLES = new Set([
  'mr', 'mrs', 'ms', 'miss', 'mstr', 'master', 'dr', 'doctor', 'prof', 'professor',
  'shri', 'sri', 'smt', 'sh', 'kum', 'kumari', 'messrs', 'late', 'er', 'adv', 'ca',
]);

/** Generational suffixes dropped before comparing names. */
const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv']);

/** Company abbreviations expanded so agency names compare consistently. */
const ALIASES: Record<string, string> = {
  pvt: 'private', pri: 'private', ltd: 'limited', co: 'company',
  corp: 'corporation', inc: 'incorporated', ent: 'enterprises', tech: 'technologies',
};

/** Lowercase, strip M/s prefix, titles, punctuation and extra spaces into comparable tokens. */
export const normalizeName = (raw?: string | null): string[] =>
  (raw ?? '')
    .toLowerCase()
    .replace(/^\s*m\s*\/\s*s\.?\s+/, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !TITLES.has(t) && !SUFFIXES.has(t))
    .map((t) => ALIASES[t] ?? t);

const levenshtein = (a: string, b: string): number => {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[b.length];
};

/** Edit distance between two tokens, or null when they are too far apart to be the same name part. */
const tokenDistance = (a: string, b: string): number | null => {
  if (a === b) return 0;
  if (a.length === 1 || b.length === 1) return a[0] === b[0] ? 0 : null;

  const shortest = Math.min(a.length, b.length);
  const allowed = shortest >= 5 ? 3 : shortest >= 4 ? 2 : 1;
  const dist = levenshtein(a, b);
  if (dist > allowed) return null;
  // Past a single-character typo, require the same initial so unrelated surnames
  // of similar shape (mehta / gupta) are not treated as the same person.
  if (dist > 1 && a[0] !== b[0]) return null;
  return dist;
};

export interface NameMatchOptions {
  /** Maximum combined edit distance allowed across all tokens. */
  totalBudget?: number;
}

/**
 * Loose person/business name comparison for KYC sources (PAN, bank records, tax record).
 * Tolerates salutations, initials, extra middle names, reordering and small spelling drift
 * so "Ashok Mehta", "Mr Ashok Mehta" and "Mrs. Ashok Mahato" all match.
 * Returns true when either side is empty so a missing source never blocks the user.
 */
export const isNameMatch = (
  a?: string | null,
  b?: string | null,
  opts: NameMatchOptions = {},
): boolean => {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left.length || !right.length) return true;

  const budget = opts.totalBudget ?? 3;
  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left];
  const used = new Set<number>();
  let spent = 0;

  for (const token of shorter) {
    let bestIdx = -1;
    let bestDist = Infinity;
    longer.forEach((candidate, i) => {
      if (used.has(i)) return;
      const dist = tokenDistance(token, candidate);
      if (dist !== null && dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    });
    if (bestIdx === -1) return false;
    used.add(bestIdx);
    spent += bestDist;
    if (spent > budget) return false;
  }

  return true;
};
