import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { unitProject } from '@setubandh/config/vitest';

export default defineConfig({ test: { projects: [unitProject({ plugins: [react()] })] } });
