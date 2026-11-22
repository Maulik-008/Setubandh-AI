import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from '../src/index';

describe('@setubandh/channels', () => {
  it('exposes its package name', () => {
    expect(PACKAGE_NAME).toBe('@setubandh/channels');
  });
});
