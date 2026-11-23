import { defineConfig } from 'vitest/config';
import { integrationProject, unitProject } from '@setubandh/config/vitest';

export default defineConfig({
  test: {
    projects: [
      unitProject(),
      integrationProject({ test: { globalSetup: ['../testing/src/global-setup.ts'] } }),
    ],
  },
});
