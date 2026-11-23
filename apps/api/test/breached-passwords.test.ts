import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { HibpBreachedPasswords } from '../src/modules/auth';

const sha1 = (s: string) => createHash('sha1').update(s).digest('hex').toUpperCase();

function fakeFetch(body: string, status = 200) {
  return vi.fn<typeof fetch>(() => Promise.resolve(new Response(body, { status })));
}

describe('HIBP k-anonymity check (FR-AUTH-11)', () => {
  const password = 'a perfectly ordinary passphrase';
  const hash = sha1(password);

  it('sends only the first 5 hash characters, with padding, and finds a match', async () => {
    const fetchImpl = fakeFetch(`0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n${hash.slice(5)}:42\r\n`);
    const checker = new HibpBreachedPasswords(fetchImpl);
    expect(await checker.isBreached(password)).toBe(true);
    const [input, init] = fetchImpl.mock.calls[0]!;
    const url = input as string;
    expect(url).toBe(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`);
    expect(url).not.toContain(hash.slice(5));
    expect(new Headers(init?.headers).get('Add-Padding')).toBe('true');
  });

  it('ignores padding entries with a count of 0', async () => {
    const checker = new HibpBreachedPasswords(fakeFetch(`${hash.slice(5)}:0\r\n`));
    expect(await checker.isBreached(password)).toBe(false);
  });

  it('falls back to the bundled list when the API fails', async () => {
    const failing = vi.fn<typeof fetch>(() => Promise.reject(new Error('network down')));
    const checker = new HibpBreachedPasswords(failing);
    expect(await checker.isBreached('password1234')).toBe(true);
    expect(await checker.isBreached(password)).toBe(false);
  });

  it('falls back when the API answers with an error status', async () => {
    const checker = new HibpBreachedPasswords(fakeFetch('oops', 503));
    expect(await checker.isBreached('qwertyuiop')).toBe(true);
  });
});
