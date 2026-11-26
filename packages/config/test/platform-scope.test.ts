import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';
import { platformScopeConfig } from '../eslint/index.js';

// M1-12: lint rule against reaching platform (non-RLS) scope from tenant modules (rule 1).
const fixtureRoot = fileURLToPath(new URL('./fixtures/repo/', import.meta.url));
const eslint = new ESLint({
  cwd: fixtureRoot,
  overrideConfigFile: true,
  overrideConfig: [
    { files: ['**/*.ts'], languageOptions: { parser: tseslint.parser } },
    platformScopeConfig('apps/api/'),
  ],
});

const errors = async (file: string) =>
  ((await eslint.lintFiles([file]))[0]?.messages ?? []).map((m) => `${m.line}: ${m.message}`);

describe('db.platform only in platform-scope modules', () => {
  it('flags db.platform and this.db.platform in a tenant module', async () => {
    const found = await errors('apps/api/src/modules/inbox/uses-platform.ts');
    expect(found).toHaveLength(2);
    expect(found[0]).toMatch(/^6: Rule 1: tenant data goes through db.withTenant\(\)/);
    expect(found[1]).toMatch(/^9: /);
  });

  it('allows it in a platform-scope module', async () => {
    expect(await errors('apps/api/src/modules/tenancy/uses-platform.ts')).toEqual([]);
  });
});
