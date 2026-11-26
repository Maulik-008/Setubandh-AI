import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { contentDisposition, StorageService, tenantPrefix } from '../src/modules/files';
import type { AppEnv } from '../src/core/env';

// The storage service signs nothing outside the calling workspace's prefix (requirements §5.2).
const env = {
  S3_ENDPOINT: 'http://localhost:8333',
  S3_BUCKET: 'test',
  S3_ACCESS_KEY: 'key',
  S3_SECRET_KEY: 'secret-secret',
} as AppEnv;
const storage = new StorageService(env);

describe('StorageService key guard', () => {
  it('signs keys under the own prefix and refuses every other key (property)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.stringMatching(/^[a-z0-9/_-]{1,40}$/),
        async (own, other, rest) => {
          fc.pre(own !== other);
          const mine = await storage.uploadUrl(own, `${tenantPrefix(own)}${rest}`, 'image/png', 10);
          expect(mine.url).toContain(`/tenants/${own}/`);
          await expect(
            storage.uploadUrl(own, `${tenantPrefix(other)}${rest}`, 'image/png', 10),
          ).rejects.toThrow(/outside the workspace/);
          await expect(storage.downloadUrl(own, `${rest}`, 'a.png', 'image/png')).rejects.toThrow(
            /outside the workspace/,
          );
        },
      ),
      { numRuns: 50 },
    );
  });

  it('refuses path tricks inside the own prefix', async () => {
    const t = '01900000-0000-7000-8000-000000000001';
    await expect(
      storage.uploadUrl(t, `${tenantPrefix(t)}../other/x`, 'image/png', 1),
    ).rejects.toThrow();
  });

  it('builds a safe Content-Disposition for any name', () => {
    fc.assert(
      fc.property(fc.string(), (name) => {
        const header = contentDisposition(name);
        expect(header.startsWith('attachment; filename="')).toBe(true);
        // No raw quote, backslash or line break can end the quoted name early.
        const quoted = header.slice(
          'attachment; filename="'.length,
          header.indexOf('"; filename*='),
        );
        expect(quoted).not.toMatch(/["\\\r\n]/);
      }),
    );
  });
});
