-- Roles, extensions and RLS helper functions (ticket M1-04, requirements §5.2).
-- Runs as orbit_admin (the migration role). The app role's password is set by the migrate script
-- from DATABASE_URL, never stored here.

CREATE EXTENSION IF NOT EXISTS citext;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint

-- orbit_app: used by api and worker. It can never bypass row-level security.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'orbit_app') THEN
    CREATE ROLE orbit_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;--> statement-breakpoint

GRANT USAGE ON SCHEMA public TO orbit_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO orbit_app;--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO orbit_app;--> statement-breakpoint
-- Tables created by later migrations (by this same migration role) get the same grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO orbit_app;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO orbit_app;--> statement-breakpoint

-- Tenant and user of the current transaction, set by db.withTenant() with set_config(..., true)
-- (the parameterised form of SET LOCAL). NULL outside withTenant, so tenant tables return no rows.
CREATE OR REPLACE FUNCTION app_current_tenant_id() RETURNS uuid
  LANGUAGE sql STABLE PARALLEL SAFE
  AS $$ SELECT nullif(current_setting('app.tenant_id', true), '')::uuid $$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS uuid
  LANGUAGE sql STABLE PARALLEL SAFE
  AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;--> statement-breakpoint

GRANT EXECUTE ON FUNCTION app_current_tenant_id() TO orbit_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_current_user_id() TO orbit_app;
