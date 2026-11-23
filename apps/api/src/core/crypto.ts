import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM for secrets at rest (TOTP secrets now, Meta tokens in M1-16), requirements §14.3.
 * Format: `v1.` + base64url(iv[12] | tag[16] | ciphertext). Tampering or a wrong key throws.
 */
export interface SecretBox {
  seal(plaintext: string): string;
  open(sealed: string): string;
}

const VERSION = 'v1.';

export function createSecretBox(keyBase64: string): SecretBox {
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes');
  return {
    seal(plaintext) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      return VERSION + Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url');
    },
    open(sealed) {
      if (!sealed.startsWith(VERSION)) throw new Error('Unknown secret format');
      const data = Buffer.from(sealed.slice(VERSION.length), 'base64url');
      if (data.length < 28) throw new Error('Sealed secret is too short'); // iv + tag (empty plaintext is valid)
      const decipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
      decipher.setAuthTag(data.subarray(12, 28));
      return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8');
    },
  };
}
