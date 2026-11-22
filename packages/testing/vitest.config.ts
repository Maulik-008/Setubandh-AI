import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import { integrationProject, unitProject } from '@setubandh/config/vitest';

const plugins = [
  swc.vite({ jsc: { transform: { legacyDecorator: true, decoratorMetadata: true } } }),
];

export default defineConfig({
  test: {
    projects: [
      unitProject({ plugins }),
      integrationProject({ plugins, test: { globalSetup: ['./src/global-setup.ts'] } }),
    ],
  },
});
