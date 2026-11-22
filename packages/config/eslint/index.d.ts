import type { Linter } from 'eslint';

export const repoRoot: string;
export const boundaryElements: { type: string; pattern: string; capture: string[] }[];
export const boundaryPolicies: Record<string, unknown>;
export function boundariesConfig(rootPath: string): Linter.Config;
export function createConfig(options: {
  tsconfigRootDir: string;
  react?: boolean;
  ignores?: string[];
}): Linter.Config[];
