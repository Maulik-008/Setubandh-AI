// Shared Vitest project presets. Each workspace composes the projects it needs.
// Workspace packages export TypeScript under the `@setubandh/source` condition (namespaced so it
// never picks up other libraries' `source` exports) (dist under `default`);
// tests always run against source.
const conditions = ['@setubandh/source', 'node', 'development|production'];
const resolve = { conditions };
// Node-side tests resolve through Vite's server (SSR) resolver, which has its own conditions.
const ssr = { resolve: { conditions, externalConditions: ['@setubandh/source'] } };

// Fast unit tests: no Docker, no browser. Excludes integration (.int.test) and browser (.browser.test) files.
export function unitProject(extra = {}) {
  return {
    ...extra,
    resolve: { ...resolve, ...extra.resolve },
    ssr: { ...ssr, ...extra.ssr },
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
    resolve: { ...resolve, ...extra.resolve },
    ssr: { ...ssr, ...extra.ssr },
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
