#!/usr/bin/env node
// Stop the local services and DELETE their data volumes (Postgres, Valkey, S3). Asks first.
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question(
  'This deletes ALL local database, queue and file data. Type "reset" to continue: ',
);
rl.close();
if (answer.trim() !== 'reset') {
  process.stdout.write('Nothing changed.\n');
  process.exit(0);
}
const result = spawnSync(
  'docker',
  [
    'compose',
    '--env-file',
    '.env',
    '-f',
    'infra/docker/docker-compose.dev.yml',
    'down',
    '--volumes',
  ],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
