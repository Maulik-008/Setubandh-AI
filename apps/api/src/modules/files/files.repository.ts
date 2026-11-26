import { Inject, Injectable } from '@nestjs/common';
import { and, eq, files, type Database } from '@setubandh/db';
import { DATABASE } from '../../core/database';

type NewFile = typeof files.$inferInsert;

/** Files are tenant data: every query runs inside withTenant, so RLS hides other workspaces. */
@Injectable()
export class FilesRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async insert(tenantId: string, userId: string, row: NewFile) {
    const [created] = await this.db.withTenant(tenantId, userId, (tx) =>
      tx.insert(files).values(row).returning(),
    );
    return created!;
  }

  async find(tenantId: string, userId: string, fileId: string) {
    const [row] = await this.db.withTenant(tenantId, userId, (tx) =>
      tx
        .select()
        .from(files)
        .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)))
        .limit(1),
    );
    return row;
  }

  async markReady(tenantId: string, userId: string, fileId: string, at: Date) {
    const [row] = await this.db.withTenant(tenantId, userId, (tx) =>
      tx
        .update(files)
        .set({ status: 'ready', completedAt: at })
        .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)))
        .returning(),
    );
    return row;
  }
}
