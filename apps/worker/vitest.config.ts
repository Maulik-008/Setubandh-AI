import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import { unitProject } from '@setubandh/config/vitest';

// SWC compiles NestJS decorators with metadata, which Vite's default transform does not emit.
const plugins = [
  swc.vite({ jsc: { transform: { legacyDecorator: true, decoratorMetadata: true } } }),
];

export default defineConfig({ test: { projects: [unitProject({ plugins })] } });
