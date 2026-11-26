import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesRepository } from './files.repository';
import { FilesService } from './files.service';
import { StorageService } from './storage.service';
import './files.openapi';

/** Signed upload and download with tenant-prefixed keys (M1-14; requirements §5.2, §12.2). */
@Module({
  controllers: [FilesController],
  providers: [FilesService, FilesRepository, StorageService],
  exports: [FilesService, StorageService],
})
export class FilesModule {}
