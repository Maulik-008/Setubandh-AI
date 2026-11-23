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
