import crypto from "crypto";

/**
 * AES-256-GCM for personal data at rest.
 *
 * Format: v1:<keyId>:<iv>:<tag>:<ciphertext>, all parts base64url.
 * The key id lets a later key be rolled in without rewriting existing rows.
 * The AAD binds a ciphertext to one column of one record, so a value copied
 * into another row fails to decrypt instead of silently belonging there.
 */

const VERSION = "v1";
const IV_BYTES = 12;

type KeyRing = { current: { id: string; key: Buffer }; byId: Map<string, Buffer> };

let cached: KeyRing | null = null;

/**
 * Keys come from PII_ENCRYPTION_KEYS as `id:base64key` pairs, newest first:
 *   PII_ENCRYPTION_KEYS=k2:BASE64...,k1:BASE64...
 * The first entry encrypts; the rest only decrypt.
 */
const loadKeys = (): KeyRing => {
  if (cached) return cached;

  const raw = (process.env.PII_ENCRYPTION_KEYS || "").trim();
  if (!raw) {
    throw new Error(
      "PII_ENCRYPTION_KEYS is not set. Generate one with: openssl rand -base64 32"
    );
  }

  const byId = new Map<string, Buffer>();
  let current: { id: string; key: Buffer } | null = null;

  for (const entry of raw.split(",")) {
    const [id, encoded] = entry.trim().split(":");
    if (!id || !encoded) continue;
    const key = Buffer.from(encoded, "base64");
    if (key.length !== 32) {
      throw new Error(`PII encryption key "${id}" must be 32 bytes (base64 of 32 random bytes)`);
    }
    byId.set(id, key);
    if (!current) current = { id, key };
  }

  if (!current) throw new Error("PII_ENCRYPTION_KEYS is set but contains no valid id:key pair");

  cached = { current, byId };
  return cached;
};

/** True once at least one usable key is configured. */
export const isPiiEncryptionConfigured = (): boolean => {
  try {
    loadKeys();
    return true;
  } catch {
    return false;
  }
};

/** True for a value this module produced, so legacy plaintext can be told apart. */
export const isEncrypted = (value?: string | null): boolean =>
  typeof value === "string" && value.startsWith(`${VERSION}:`);

/**
 * Encrypt a value. `context` binds it to a column and record,
 * e.g. `identity_verification:image:42`.
 */
export const encryptPii = (plaintext: string, context: string): string => {
  const { current } = loadKeys();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", current.key, iv);
  cipher.setAAD(Buffer.from(context, "utf8"));

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    current.id,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
};

/**
 * Decrypt a value produced by encryptPii. Values written before encryption was
 * switched on are returned untouched so existing rows keep working.
 * `context` must match the one used to encrypt.
 */
export const decryptPii = (value: string | null | undefined, context: string): string => {
  if (!value) return "";
  if (!isEncrypted(value)) return value;

  const [, keyId, iv, tag, ciphertext] = value.split(":");
  const { byId } = loadKeys();
  const key = byId.get(keyId);
  if (!key) throw new Error(`No PII encryption key configured for id "${keyId}"`);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
};

/** Context string for the identity document photo held in IdentityVerification.meta_data. */
export const identityImageContext = (userId: number): string =>
  `identity_verification:meta_data.image:${userId}`;
