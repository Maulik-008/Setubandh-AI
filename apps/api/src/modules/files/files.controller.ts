import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  uploadUrlRequestSchema,
  z,
  type DownloadUrlResponse,
  type FileResponse,
  type UploadUrlRequest,
  type UploadUrlResponse,
} from '@setubandh/shared';
import { RequirePermission } from '../../core/access';
import { ZodBody, ZodParams } from '../../core/validation';
import { CurrentUser, type AuthUser } from '../auth';
import { CurrentWorkspace, type WorkspaceContext } from '../tenancy';
import { FilesService } from './files.service';

const idParams = z.object({ id: z.uuid() });

/**
 * Files of the current workspace. Any member may upload and read: attachments belong to
 * conversations, which every MVP 1 role reads (finer checks come with the inbox).
 */
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('upload-url')
  @HttpCode(201)
  @RequirePermission()
  uploadUrl(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: AuthUser,
    @ZodBody(uploadUrlRequestSchema) body: UploadUrlRequest,
  ): Promise<UploadUrlResponse> {
    return this.files.createUpload(ws.tenantId, user.id, body);
  }

  @Post(':id/complete')
  @HttpCode(200)
  @RequirePermission()
  complete(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: AuthUser,
    @ZodParams(idParams) params: { id: string },
  ): Promise<FileResponse> {
    return this.files.complete(ws.tenantId, user.id, params.id);
  }

  @Get(':id')
  @RequirePermission()
  download(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: AuthUser,
    @ZodParams(idParams) params: { id: string },
  ): Promise<DownloadUrlResponse> {
    return this.files.download(ws.tenantId, user.id, params.id);
  }
}
