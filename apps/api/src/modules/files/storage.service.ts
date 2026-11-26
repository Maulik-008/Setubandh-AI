import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { SIGNED_URL_TTL_SECONDS } from '@setubandh/shared';
import { ENV, type AppEnv } from '../../core/env';

/** Every object of a workspace lives under this prefix (requirements §5.2). */
export const tenantPrefix = (tenantId: string) => `tenants/${tenantId}/`;

/**
 * S3-compatible object storage: Cloudflare R2 in production, SeaweedFS locally and in tests
 * (ADR 0011). The only place that signs URLs; it refuses any key outside the calling
 * workspace's prefix, so a bug elsewhere cannot hand out another workspace's file.
 */
@Injectable()
export class StorageService implements OnApplicationShutdown {
  private client: S3Client | undefined;

  constructor(@Inject(ENV) private readonly env: AppEnv) {}

  private get s3(): S3Client {
    this.client ??= new S3Client({
      endpoint: this.env.S3_ENDPOINT,
      region: 'auto', // R2 ignores the region; SeaweedFS accepts any
      forcePathStyle: true,
      // The SDK otherwise signs a CRC32 of an empty body into presigned PUTs, which R2 and
      // SeaweedFS then reject (BadDigest). Checksums only where the API requires them.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: { accessKeyId: this.env.S3_ACCESS_KEY, secretAccessKey: this.env.S3_SECRET_KEY },
    });
    return this.client;
  }

  private assertOwned(tenantId: string, key: string): void {
    if (!key.startsWith(tenantPrefix(tenantId)) || key.includes('..')) {
      throw new Error('Refusing a storage key outside the workspace prefix');
    }
  }

  /** A signed PUT; the content type and length are part of the signature. */
  async uploadUrl(tenantId: string, key: string, mime: string, sizeBytes: number) {
    this.assertOwned(tenantId, key);
    const url = await getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: this.env.S3_BUCKET,
        Key: key,
        ContentType: mime,
        ContentLength: sizeBytes,
      }),
      {
        expiresIn: SIGNED_URL_TTL_SECONDS,
        signableHeaders: new Set(['content-type', 'content-length']),
      },
    );
    return { url, headers: { 'content-type': mime } };
  }

  /** A signed GET that always downloads (never renders on our domain) under the original name. */
  async downloadUrl(
    tenantId: string,
    key: string,
    filename: string,
    mime: string,
  ): Promise<string> {
    this.assertOwned(tenantId, key);
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: this.env.S3_BUCKET,
        Key: key,
        ResponseContentType: mime,
        ResponseContentDisposition: contentDisposition(filename),
      }),
      { expiresIn: SIGNED_URL_TTL_SECONDS },
    );
  }

  /** The stored object's size and type, or null when nothing was uploaded. */
  async head(tenantId: string, key: string): Promise<{ sizeBytes: number; mime: string } | null> {
    this.assertOwned(tenantId, key);
    try {
      const out = await this.s3.send(
        new HeadObjectCommand({ Bucket: this.env.S3_BUCKET, Key: key }),
      );
      return { sizeBytes: out.ContentLength ?? 0, mime: (out.ContentType ?? '').toLowerCase() };
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode;
      if (status === 404) return null;
      throw error;
    }
  }

  async delete(tenantId: string, key: string): Promise<void> {
    this.assertOwned(tenantId, key);
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.env.S3_BUCKET, Key: key }));
  }

  onApplicationShutdown(): void {
    this.client?.destroy();
  }
}

/** RFC 6266: an ASCII fallback plus the UTF-8 name, quotes and control characters removed. */
export function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
