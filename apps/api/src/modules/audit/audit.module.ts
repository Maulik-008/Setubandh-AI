import { Module } from '@nestjs/common';
import { AuditService, PlatformAuditService } from './audit.service';

/** Tenant and platform audit logs (M1-12). Other modules record through these services. */
@Module({
  providers: [AuditService, PlatformAuditService],
  exports: [AuditService, PlatformAuditService],
})
export class AuditModule {}
