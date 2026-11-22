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
      },
    },
    boundariesConfig(repoRoot),
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
