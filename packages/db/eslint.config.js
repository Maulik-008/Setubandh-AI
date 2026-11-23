import { createConfig } from '@setubandh/config/eslint';

export default [
  ...createConfig({ tsconfigRootDir: import.meta.dirname }),
  // This package may open raw Postgres connections (rule 1 allows it only here and in tests).
  {
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [{ name: 'zod', message: "Import { z } from '@setubandh/shared'." }] },
      ],
    },
  },
];
