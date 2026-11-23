import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@setubandh/shared';
import { DATABASE_HEALTH, VALKEY_HEALTH, type HealthProbe } from './health.probes';

export type CheckStatus = 'up' | 'down';

/** Each dependency must answer within this time for the API to count as ready. */
const CHECK_TIMEOUT_MS = 2_000;

async function probe(check: HealthProbe): Promise<CheckStatus> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), CHECK_TIMEOUT_MS);
  });
  try {
    await Promise.race([check.check(), timeout]);
    return 'up';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}

@Injectable()
export class HealthService {
  constructor(
    @Inject(DATABASE_HEALTH) private readonly database: HealthProbe,
    @Inject(VALKEY_HEALTH) private readonly valkey: HealthProbe,
  ) {}

  /** Readiness: Postgres and Valkey both answer. Error text is never exposed, only up/down. */
  async readiness(): Promise<{ status: 'ok'; checks: Record<string, CheckStatus> }> {
    const [database, valkey] = await Promise.all([probe(this.database), probe(this.valkey)]);
    const checks = { database, valkey };
    if (database === 'down' || valkey === 'down') {
      throw new AppError('SERVICE_UNAVAILABLE', { details: { checks } });
    }
    return { status: 'ok', checks };
  }
}
