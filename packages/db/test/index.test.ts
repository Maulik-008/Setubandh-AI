import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from '../src/index';

describe('@setubandh/db', () => {
  it('exposes its package name', () => {
    expect(PACKAGE_NAME).toBe('@setubandh/db');
  });
});
