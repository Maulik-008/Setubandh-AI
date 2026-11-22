import type { TestProjectInlineConfiguration } from 'vitest/config';

/** Fast unit tests: no Docker, no browser. */
export function unitProject(extra?: TestProjectInlineConfiguration): TestProjectInlineConfiguration;
/** Integration tests against real Postgres and Valkey containers (*.int.test.ts). */
export function integrationProject(
  extra?: TestProjectInlineConfiguration,
): TestProjectInlineConfiguration;
