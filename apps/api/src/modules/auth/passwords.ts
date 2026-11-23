import { hash, verify, type Options } from '@node-rs/argon2';

/** `Algorithm.Argon2id` (a const enum the isolated-modules build cannot inline). */
const ARGON2ID = 2 as Options['algorithm'];

/** argon2id at the OWASP minimum (19 MiB, 2 iterations, 1 lane). FR-AUTH-11. */
const OPTIONS: Options = { algorithm: ARGON2ID, memoryCost: 19_456, timeCost: 2, parallelism: 1 };

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

/** A real hash checked when the account does not exist, so timing does not reveal accounts. */
let dummyHash: Promise<string> | undefined;

export async function verifyPassword(
  passwordHash: string | null,
  password: string,
): Promise<boolean> {
  if (!passwordHash) {
    dummyHash ??= hash('not-a-real-password-for-timing', OPTIONS);
    await verify(await dummyHash, password);
    return false;
  }
  return verify(passwordHash, password);
}
