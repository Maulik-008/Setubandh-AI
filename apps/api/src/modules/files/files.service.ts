import { Inject, Injectable } from '@nestjs/common';
import { files } from '@setubandh/db';
import {
  AppError,
  SIGNED_URL_TTL_SECONDS,
  type DownloadUrlResponse,
  type FileResponse,
  type UploadUrlRequest,
  type UploadUrlResponse,
} from '@setubandh/shared';
import { uuidv7 } from 'uuidv7';
import { CLOCK, type Clock } from '../../core/clock';
import { FilesRepository } from './files.repository';
import { StorageService, tenantPrefix } from './storage.service';

type FileRow = typeof files.$inferSelect;

const toDto = (f: FileRow): FileResponse => ({
  id: f.id,
  purpose: f.purpose,
  filename: f.filename,
  mime: f.mime,
  sizeBytes: f.sizeBytes,
  status: f.status,
});

/**
 * Signed upload and download (requirements §5.2, §12.2). The file row is read through the
 * workspace's RLS scope before any URL is signed, so another workspace's file id is simply
 * "not found".
 */
@Injectable()
export class FilesService {
  constructor(
    private readonly repo: FilesRepository,
    private readonly storage: StorageService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async createUpload(
    tenantId: string,
    userId: string,
    input: UploadUrlRequest,
  ): Promise<UploadUrlResponse> {
    const now = this.clock.now();
    const id = uuidv7();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    // The key never contains the filename: names are data, not paths.
    const storageKey = `${tenantPrefix(tenantId)}${input.purpose}/${now.getUTCFullYear()}/${month}/${id}`;
    await this.repo.insert(tenantId, userId, {
      id,
      tenantId,
      purpose: input.purpose,
      storageKey,
      filename: input.filename,
      mime: input.mime,
      sizeBytes: input.sizeBytes,
      uploadedBy: userId,
    });
    const { url, headers } = await this.storage.uploadUrl(
      tenantId,
      storageKey,
      input.mime,
      input.sizeBytes,
    );
    return {
      fileId: id,
      uploadUrl: url,
      headers,
      expiresAt: new Date(now.getTime() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
    };
  }

  /** Check the stored object really is the declared file, then mark it ready. */
  async complete(tenantId: string, userId: string, fileId: string): Promise<FileResponse> {
    const file = await this.repo.find(tenantId, userId, fileId);
    if (!file) throw new AppError('NOT_FOUND');
    if (file.status === 'ready') return toDto(file);
    const stored = await this.storage.head(tenantId, file.storageKey);
    if (!stored) {
      throw new AppError('CONFLICT', {
        message: 'The upload has not finished. Upload the file, then try again.',
      });
    }
    if (stored.sizeBytes !== file.sizeBytes || stored.mime !== file.mime) {
      await this.storage.delete(tenantId, file.storageKey);
      throw new AppError('VALIDATION_FAILED', {
        message: 'The uploaded file does not match what was announced. Upload it again.',
      });
    }
    const ready = await this.repo.markReady(tenantId, userId, fileId, this.clock.now());
    return toDto(ready!);
  }

  async download(tenantId: string, userId: string, fileId: string): Promise<DownloadUrlResponse> {
    const file = await this.repo.find(tenantId, userId, fileId);
    if (!file) throw new AppError('NOT_FOUND');
    if (file.status !== 'ready') {
      throw new AppError('CONFLICT', { message: 'This file has not finished uploading.' });
    }
    const url = await this.storage.downloadUrl(tenantId, file.storageKey, file.filename, file.mime);
    return {
      ...toDto(file),
      url,
      expiresAt: new Date(this.clock.now().getTime() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
    };
  }
}
