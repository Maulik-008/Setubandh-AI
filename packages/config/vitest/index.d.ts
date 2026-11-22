// The presets are typed structurally (not via vitest's own types) so each workspace keeps its
// own vitest type instance: pnpm can install vitest more than once when optional peers differ.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProjectTest = any;
type ProjectConfig = { plugins?: unknown[]; test?: ProjectTest; [key: string]: unknown };

/** Fast unit tests: no Docker, no browser. */
export function unitProject(): { test: ProjectTest };
export function unitProject<T extends ProjectConfig>(extra: T): T & { test: ProjectTest };

/** Integration tests against real Postgres and Valkey containers (*.int.test.ts). */
export function integrationProject(): { test: ProjectTest };
export function integrationProject<T extends ProjectConfig>(extra: T): T & { test: ProjectTest };
