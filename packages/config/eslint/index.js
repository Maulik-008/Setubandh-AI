// Shared ESLint flat config for every workspace in the Setubandh AI monorepo.
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/** Absolute path of the monorepo root (this file lives in packages/config/eslint/). */
export const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

/**
 * Architecture elements (requirements §4.5).
 * Order matters: the most specific pattern must come first.
 */
export const boundaryElements = [
  { type: 'module', pattern: 'apps/*/src/modules/*', capture: ['app', 'module'] },
  { type: 'app', pattern: 'apps/*', capture: ['app'] },
  { type: 'package', pattern: 'packages/*', capture: ['pkg'] },
];

/**
 * Dependency policies:
 * - a module may import another module only through its public entry (index.ts);
 * - files inside one module may import each other;
 * - app code may import its own modules (entry only) and any package;
 * - packages may import other packages, never apps;
 * - apps may not import other apps.
 */
export const boundaryPolicies = {
  default: 'disallow',
  message:
    'Import not allowed by module boundaries ({{ from.element.type }} → {{ to.element.type }}). Import another module only through its index.ts (its service), and never import apps from packages or other apps.',
  policies: [
    { allow: { dependency: { relationship: { to: 'internal' } } } },
    {
      from: { element: { type: 'module', captured: { app: '{{ from.element.captured.app }}' } } },
      allow: {
        to: {
          element: {
            type: 'module',
            captured: { app: '{{ from.element.captured.app }}' },
            fileInternalPath: 'index.ts',
          },
        },
      },
    },
    {
      from: { element: { type: 'app' } },
      allow: {
        to: {
          element: {
            type: 'module',
            captured: { app: '{{ from.element.captured.app }}' },
            fileInternalPath: 'index.ts',
          },
        },
      },
    },
    {
      from: { element: { type: 'module' } },
      allow: {
        to: { element: { type: 'app', captured: { app: '{{ from.element.captured.app }}' } } },
      },
    },
    {
      from: { element: { types: ['app', 'module', 'package'] } },
      allow: { to: { element: { type: 'package' } } },
    },
    {
      from: { element: { type: 'app', captured: { app: '{web,admin}' } } },
      disallow: { to: { element: { type: 'package', captured: { pkg: 'env' } } } },
      message:
        '@setubandh/env is server-only (secrets): the web and admin apps must not import it. Read public settings from import.meta.env instead.',
    },
  ],
};

/**
 * The module-boundary part of the config, on its own so tests can point it at a fixture tree.
 * @param {string} rootPath absolute path that element patterns are relative to
 * @returns {import('eslint').Linter.Config}
 */
export function boundariesConfig(rootPath) {
  return {
    plugins: { boundaries },
    settings: {
      'boundaries/root-path': rootPath,
      'boundaries/elements': boundaryElements,
      'boundaries/include': ['apps/**/*', 'packages/**/*'],
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          noWarnOnMultipleProjects: true,
          project: [`${rootPath}apps/*/tsconfig.json`, `${rootPath}packages/*/tsconfig.json`],
        },
        node: true,
      },
    },
    rules: { 'boundaries/dependencies': ['error', boundaryPolicies] },
  };
}

/**
 * Build the flat config for one workspace.
 * @param {{ tsconfigRootDir: string, react?: boolean, ignores?: string[] }} options
 */
/**
 * Modules that own platform-scope tables (requirements §11.2) and may use `db.platform`. Every
 * other module reads and writes tenant data only through `db.withTenant()` (rule 1, M1-12).
 */
export const PLATFORM_SCOPE_MODULES = [
  'auth',
  'users',
  'tenancy',
  'audit',
  'platform',
  'platform-admin',
  'billing',
];

/** `db.platform` / `this.db.platform` outside the platform-scope modules is a lint error. */
export function platformScopeConfig(prefix = '') {
  const message =
    'Rule 1: tenant data goes through db.withTenant(). db.platform is only for the platform-scope modules (' +
    PLATFORM_SCOPE_MODULES.join(', ') +
    ').';
  return {
    files: [`${prefix}src/modules/**/*.ts`],
    ignores: [`${prefix}src/modules/{${PLATFORM_SCOPE_MODULES.join(',')}}/**`],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: "MemberExpression[object.name='db'][property.name='platform']", message },
        {
          selector: "MemberExpression[object.property.name='db'][property.name='platform']",
          message,
        },
      ],
    },
  };
}

export function createConfig({ tsconfigRootDir, react = false, ignores = [] }) {
  return tseslint.config(
    {
      ignores: [
        'dist/**',
        'coverage/**',
        'playwright-report/**',
        'test-results/**',
        '**/*.d.ts',
        ...ignores,
      ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
        globals: react ? { ...globals.browser } : { ...globals.node },
      },
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'pg',
                message:
                  'Rule 1: no raw database access outside packages/db. Use db.withTenant() or db.platform.',
              },
              {
                name: 'drizzle-orm/node-postgres',
                message: 'Rule 1: create database clients only in packages/db (createDatabase).',
              },
              {
                name: 'zod',
                message:
                  "Import { z } from '@setubandh/shared' (one Zod instance, extended for OpenAPI).",
              },
            ],
          },
        ],
      },
    },
    boundariesConfig(repoRoot),
    platformScopeConfig(),
    {
      // Test matchers (expect.any, JSON.parse of fixtures) are typed `any`; keep app code strict.
      files: ['**/*.test.ts', '**/*.test.tsx', '**/test/**/*.ts', '**/e2e/**/*.ts'],
      rules: {
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
      },
    },
    {
      files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
      ...tseslint.configs.disableTypeChecked,
    },
    ...(react
      ? [
          {
            // React rules apply to app source only (Playwright fixtures also use a `use` callback).
            files: ['src/**/*.tsx', 'src/**/*.ts'],
            plugins: { 'react-hooks': reactHooks },
            rules: reactHooks.configs.recommended.rules,
          },
        ]
      : []),
    prettier,
  );
}
