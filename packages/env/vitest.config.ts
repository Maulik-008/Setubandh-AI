import { defineConfig } from 'vitest/config';
import { unitProject } from '@setubandh/config/vitest';

export default defineConfig({ test: { projects: [unitProject()] } });
