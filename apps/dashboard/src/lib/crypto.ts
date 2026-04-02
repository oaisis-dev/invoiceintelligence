import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption for OAuth tokens.
 *
 * Wire format (base64):  nonce (12 bytes) || ciphertext || authTag (16 bytes)
 *
 * Compatible with the Python `token_encryption.py` utility in workers/,
 * so either side can decrypt the other's output.
 */

function deriveKey(keyHex: string): Buffer {
  const buf = Buffer.from(keyHex, "hex");
  if (buf.length !== 32) {
    throw new Error(
      `Encryption key must be exactly 32 bytes (64 hex chars), got ${buf.length}`
    );
  }
  return buf;
}

export function encryptToken(plaintext: string, keyHex: string): string {
  const key = deriveKey(keyHex);
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag(); // 16 bytes

  // nonce || ciphertext || authTag
  return Buffer.concat([nonce, encrypted, authTag]).toString("base64");
}

export function decryptToken(encryptedB64: string, keyHex: string): string {
  const key = deriveKey(keyHex);
  const raw = Buffer.from(encryptedB64, "base64");

  const nonce = raw.subarray(0, 12);
  const authTag = raw.subarray(raw.length - 16);
  const ciphertext = raw.subarray(12, raw.length - 16);

  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
