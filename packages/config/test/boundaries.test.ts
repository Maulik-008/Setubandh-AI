import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';
import { boundariesConfig } from '../eslint/index.js';

const fixtureRoot = fileURLToPath(new URL('./fixtures/repo/', import.meta.url));

const eslint = new ESLint({
  cwd: fixtureRoot,
  overrideConfigFile: true,
  overrideConfig: [
    { files: ['**/*.ts'], languageOptions: { parser: tseslint.parser } },
    boundariesConfig(fixtureRoot),
  ],
});

async function boundaryErrors(relativePath: string): Promise<string[]> {
  const [result] = await eslint.lintFiles([relativePath]);
  return (result?.messages ?? [])
    .filter((m) => m.ruleId === 'boundaries/dependencies' || m.fatal)
    .map((m) => m.message);
}

describe('module boundaries (requirements §4.5)', () => {
  it('allows a module to import another module through its index.ts', async () => {
    expect(await boundaryErrors('apps/api/src/modules/beta/good-entry.ts')).toEqual([]);
  });

  it("fails when a module imports another module's internal file", async () => {
    const errors = await boundaryErrors('apps/api/src/modules/beta/bad-internal.ts');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('index.ts');
  });

  it('allows files inside the same module to import each other', async () => {
    expect(await boundaryErrors('apps/api/src/modules/alpha/same-module.ts')).toEqual([]);
  });

  it('allows app code to import a module through its index.ts', async () => {
    expect(await boundaryErrors('apps/api/src/app-entry.ts')).toEqual([]);
  });

  it("fails when app code imports a module's internal file", async () => {
    expect(await boundaryErrors('apps/api/src/app-internal.ts')).toHaveLength(1);
  });

  it('allows modules to import packages', async () => {
    expect(await boundaryErrors('apps/api/src/modules/beta/package-import.ts')).toEqual([]);
  });

  it('fails when an app imports another app', async () => {
    expect(await boundaryErrors('apps/api/src/other-app.ts')).toHaveLength(1);
  });

  it('fails when a package imports an app', async () => {
    expect(await boundaryErrors('packages/shared/src/imports-app.ts')).toHaveLength(1);
  });
});
