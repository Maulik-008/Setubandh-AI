import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createSecretBox } from '../src/core/crypto';

const key = Buffer.alloc(32, 9).toString('base64');

describe('secret box (AES-256-GCM, requirements §14.3)', () => {
  const box = createSecretBox(key);

  it('round-trips any secret', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (secret) => {
        expect(box.open(box.seal(secret))).toBe(secret);
      }),
    );
  });

  it('never contains a realistic secret in the clear', () => {
    // Very short strings can appear in random ciphertext by chance; real secrets are 16+ chars.
    fc.assert(
      fc.property(fc.string({ minLength: 12, maxLength: 200 }), (secret) => {
        expect(box.seal(secret)).not.toContain(secret);
      }),
    );
  });

  it('uses a fresh IV each time (same input, different ciphertext)', () => {
    expect(box.seal('JBSWY3DPEHPK3PXP')).not.toBe(box.seal('JBSWY3DPEHPK3PXP'));
  });

  it('rejects any tampered ciphertext', () => {
    const sealed = box.seal('a secret value');
    fc.assert(
      fc.property(fc.nat({ max: sealed.length - 1 }), (index) => {
        const chars = [...sealed];
        chars[index] = chars[index] === 'A' ? 'B' : 'A';
        const tampered = chars.join('');
        if (tampered === sealed) return;
        expect(() => box.open(tampered)).toThrow();
      }),
    );
  });

  it('rejects ciphertext sealed with another key', () => {
    const other = createSecretBox(Buffer.alloc(32, 1).toString('base64'));
    expect(() => box.open(other.seal('x'))).toThrow();
  });
});
