import type { TestProject } from 'vitest/node';
import { startTestInfra } from './containers';

import './vitest-context';

/**
 * Vitest globalSetup for integration projects: starts the containers once per run and
 * hands their URLs to test files through `inject('postgresUrl')` / `inject('valkeyUrl')`.
 */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const infra = await startTestInfra();
  project.provide('postgresUrl', infra.postgresUrl);
  project.provide('valkeyUrl', infra.valkeyUrl);
  return infra.stop;
}
