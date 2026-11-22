// Shared Vitest project presets. Each workspace composes the projects it needs.

// Fast unit tests: no Docker, no browser. Excludes integration (.int.test) and browser (.browser.test) files.
export function unitProject(extra = {}) {
  return {
    ...extra,
    test: {
      name: 'unit',
      include: ['test/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
      exclude: ['**/*.int.test.ts', '**/*.browser.test.{ts,tsx}', '**/node_modules/**', 'e2e/**'],
      environment: 'node',
      ...extra.test,
    },
  };
}

// Integration tests against real Postgres and Valkey containers (files ending .int.test.ts).
export function integrationProject(extra = {}) {
  return {
    ...extra,
    test: {
      name: 'integration',
      include: ['test/**/*.int.test.ts', 'src/**/*.int.test.ts'],
      environment: 'node',
      testTimeout: 60_000,
      hookTimeout: 180_000,
      ...extra.test,
    },
  };
}
