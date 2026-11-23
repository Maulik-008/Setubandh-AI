// `pnpm env:check`: validate the repo-root .env without starting anything. Used first by `pnpm dev`.
import { loadEnvOrExit } from './load';

loadEnvOrExit();
process.stdout.write('Environment OK.\n');
