import { createConfig } from '@setubandh/config/eslint';

export default createConfig({
  tsconfigRootDir: import.meta.dirname,
  react: true,
  ignores: ['dist-e2e/**'],
});
