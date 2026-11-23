/** Answers whether a password is known from data breaches (FR-AUTH-11). */
export interface BreachedPasswordChecker {
  isBreached(password: string): Promise<boolean>;
}

export const BREACHED_PASSWORDS = Symbol('BREACHED_PASSWORDS');

/**
 * Bundled fallback: very common breached passwords that pass the length rule. Used when the
 * HIBP range API is unreachable (M1-09b adds the API client in front of it).
 */
const COMMON_BREACHED = new Set(
  [
    '1234567890',
    '12345678910',
    '0123456789',
    'qwertyuiop',
    'password123',
    'password1234',
    'iloveyou123',
    '1q2w3e4r5t',
    'qwerty12345',
    '1qaz2wsx3edc',
    'asdfghjkl1',
    'zaq12wsxcde',
    'abcdefghij',
    'abc1234567',
    'passw0rd123',
    'welcome123',
    'football123',
    'princess123',
    'sunshine123',
    'qwertyuiop123',
    '11111111111',
    '0000000000',
    '1111111111',
    'aaaaaaaaaa',
    'administrator',
    'letmein1234',
    'monkey12345',
    'dragon12345',
    'changeme123',
    'password12',
  ].map((p) => p.toLowerCase()),
);

export class LocalBreachedPasswords implements BreachedPasswordChecker {
  isBreached(password: string): Promise<boolean> {
    return Promise.resolve(COMMON_BREACHED.has(password.toLowerCase()));
  }
}

const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/';
const HIBP_TIMEOUT_MS = 2_000;

/**
 * Have I Been Pwned range API (k-anonymity): only the first 5 hex characters of the password's
 * SHA-1 leave the server, with response padding on. If the API is unreachable, the bundled list
 * is checked instead so signups never fail because of a third party.
 */
export class HibpBreachedPasswords implements BreachedPasswordChecker {
  private readonly fallback = new LocalBreachedPasswords();

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async isBreached(password: string): Promise<boolean> {
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    try {
      const response = await this.fetchImpl(`${HIBP_RANGE_URL}${prefix}`, {
        headers: { 'Add-Padding': 'true', 'User-Agent': 'setubandh-ai-password-check' },
        signal: AbortSignal.timeout(HIBP_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HIBP status ${response.status}`);
      for (const line of (await response.text()).split('\n')) {
        const [candidate, count] = line.trim().split(':');
        if (candidate === suffix) return Number(count) > 0;
      }
      return false;
    } catch {
      return this.fallback.isBreached(password);
    }
  }
}
