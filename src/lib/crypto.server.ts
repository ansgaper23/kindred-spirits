import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Advanced Technical Skills Master: Implementing AES-256-GCM encryption for tokens.
 * This ensures that GitHub access tokens are encrypted in the database.
 */

// In production, this must be a 32-byte hex string in process.env.ENCRYPTION_KEY
const getEncryptionKey = () => {
  const key = process.env["ENCRYPTION_KEY"];
  if (!key) {
    // Fallback for dev/preview if not set, but warned in logs
    console.warn("ENCRYPTION_KEY is not set. Using a fallback key. DO NOT USE IN PRODUCTION.");
    return scryptSync("fallback-secret-salt", "salt", 32);
  }
  return Buffer.from(key, "hex");
};

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Return IV + AuthTag + Encrypted content as a single hex string
  return Buffer.concat([iv, authTag, encrypted]).toString("hex");
}

export function decrypt(encryptedHex: string): string {
  const data = Buffer.from(encryptedHex, "hex");
  
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  
  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  
  return decipher.update(encrypted) + decipher.final("utf8");
}

/** Decrypts if it looks like an encrypted hex string, otherwise returns as is (migration path) */
export function decryptSafe(maybeEncrypted: string | null): string | null {
  if (!maybeEncrypted) return null;
  // Simple heuristic: if it's hex and long enough for IV(12)+Tag(16)+Data, try decrypting
  if (/^[0-9a-f]{60,}$/i.test(maybeEncrypted)) {
    try {
      return decrypt(maybeEncrypted);
    } catch {
      return maybeEncrypted;
    }
  }
  return maybeEncrypted;
}
