import { Inject, Injectable } from '@nestjs/common';
import { eq, users, type Database } from '@setubandh/db';
import { AppError, type MeResponse, type UpdateMeRequest } from '@setubandh/shared';
import { DATABASE } from '../../core/database';

type UserRow = typeof users.$inferSelect;

const toMe = (u: UserRow): MeResponse => ({
  id: u.id,
  email: u.email,
  name: u.name,
  emailVerified: u.emailVerifiedAt !== null,
  locale: u.locale,
  avatarUrl: u.avatarUrl,
  twoFactorEnabled: u.totpEnabled,
});

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async getMe(userId: string): Promise<MeResponse> {
    const user = await this.db.platform.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new AppError('UNAUTHENTICATED');
    return toMe(user);
  }

  async updateMe(userId: string, changes: UpdateMeRequest): Promise<MeResponse> {
    const [user] = await this.db.platform
      .update(users)
      .set(changes)
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new AppError('UNAUTHENTICATED');
    return toMe(user);
  }
}
