const IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/;

/**
 * SQL that isolates a tenant table (requirements §5.2): enable and FORCE row-level security and
 * add one policy for orbit_app with the same USING and WITH CHECK condition. Use it in the custom
 * migration of every new tenant table, after creating the table and its `tenant_id` index.
 *
 * `(SELECT app_current_tenant_id())` is evaluated once per statement, not once per row.
 */
export function tenantIsolationSql(table: string): string {
  if (!IDENTIFIER.test(table)) throw new Error(`Invalid table name: ${table}`);
  const condition = 'tenant_id = (SELECT app_current_tenant_id())';
  return [
    `ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`,
    `CREATE POLICY "${table}_tenant_isolation" ON "${table}" AS PERMISSIVE FOR ALL TO orbit_app`,
    `  USING (${condition})`,
    `  WITH CHECK (${condition});`,
  ].join('\n');
}
