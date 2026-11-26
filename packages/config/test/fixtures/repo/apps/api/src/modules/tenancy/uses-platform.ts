// Fixture: a platform-scope module may use db.platform.
declare const db: { platform: unknown };
export const allowed = db.platform;
