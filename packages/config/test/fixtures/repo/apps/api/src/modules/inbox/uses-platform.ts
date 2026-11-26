// Fixture: a tenant module reaching for platform scope (must be a lint error).
declare const db: { platform: unknown; withTenant: unknown };
export class ConversationsRepository {
  constructor(private readonly db: { platform: unknown }) {}
  bad() {
    return this.db.platform;
  }
}
export const alsoBad = db.platform;
export const fine = db.withTenant;
