import { createConfig } from '@setubandh/config/eslint';

export default [
  ...createConfig({ tsconfigRootDir: import.meta.dirname }),
  // The shared package owns the single Zod instance.
  { files: ['src/zod.ts'], rules: { 'no-restricted-imports': 'off' } },
];
