-- M1-12: append-only audit logs (requirements §11.2, FR-AUD-01..03, P1-05).
-- Hand-written: drizzle-kit cannot express partitioned tables. The Drizzle definitions in
-- src/schema/audit.ts are for queries only and are excluded from drizzle-kit's diff.

-- Tenant audit log: RLS like every tenant table, partitioned by month on created_at.
CREATE TABLE "audit_logs" (
	"id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
	"actor_type" text NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip" inet,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id", "created_at"),
	CONSTRAINT "audit_logs_actor_type_check" CHECK (actor_type IN ('user', 'ai', 'system', 'platform_admin'))
) PARTITION BY RANGE ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_created_idx" ON "audit_logs" ("tenant_id", "created_at" DESC);--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "audit_logs_tenant_isolation" ON "audit_logs" AS PERMISSIVE FOR ALL TO orbit_app
  USING (tenant_id = (SELECT app_current_tenant_id()))
  WITH CHECK (tenant_id = (SELECT app_current_tenant_id()));--> statement-breakpoint

-- Platform audit log: platform scope (no RLS). tenant_id has no foreign key on purpose, so the
-- history of a deleted workspace survives. admin_id gets its foreign key with admin lite (M1-30).
CREATE TABLE "platform_audit_logs" (
	"id" uuid NOT NULL,
	"admin_id" uuid NOT NULL,
	"tenant_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"before" jsonb,
	"after" jsonb,
	"reason" text,
	"ip" inet,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id", "created_at")
) PARTITION BY RANGE ("created_at");--> statement-breakpoint
CREATE INDEX "platform_audit_logs_created_idx" ON "platform_audit_logs" ("created_at" DESC);--> statement-breakpoint
CREATE INDEX "platform_audit_logs_tenant_created_idx" ON "platform_audit_logs" ("tenant_id", "created_at" DESC) WHERE "tenant_id" IS NOT NULL;--> statement-breakpoint

-- Append-only for the app role: read and insert, never update, delete or truncate.
-- (Default privileges from 0000 granted UPDATE and DELETE on every new table.)
REVOKE ALL ON "audit_logs", "platform_audit_logs" FROM orbit_app;--> statement-breakpoint
GRANT SELECT, INSERT ON "audit_logs", "platform_audit_logs" TO orbit_app;--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON "security_events" FROM orbit_app;--> statement-breakpoint

-- Monthly partitions. Partitions get no grants (reachable only through the parent, where RLS and
-- the append-only grants apply) and forced RLS without policies as a second lock.
CREATE OR REPLACE FUNCTION app_lock_audit_partition(part regclass) RETURNS void
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  EXECUTE format('REVOKE ALL ON %s FROM orbit_app', part);
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', part);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', part);
END $$;--> statement-breakpoint
REVOKE ALL ON FUNCTION app_lock_audit_partition(regclass) FROM PUBLIC;--> statement-breakpoint

-- Creates the current month through `months_ahead` for both audit tables; returns how many it
-- created. Idempotent and safe to run concurrently. The worker calls it daily (SECURITY DEFINER:
-- orbit_app may run it but cannot create tables itself).
CREATE OR REPLACE FUNCTION app_ensure_audit_partitions(months_ahead integer DEFAULT 3) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  parent text;
  month_start date;
  part text;
  created integer := 0;
BEGIN
  IF months_ahead < 0 OR months_ahead > 24 THEN
    RAISE EXCEPTION 'months_ahead must be between 0 and 24';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('app_ensure_audit_partitions'));
  FOREACH parent IN ARRAY ARRAY['audit_logs', 'platform_audit_logs'] LOOP
    FOR i IN 0..months_ahead LOOP
      month_start := (date_trunc('month', now() AT TIME ZONE 'UTC') + make_interval(months => i))::date;
      part := format('%s_%s', parent, to_char(month_start, 'YYYY_MM'));
      IF to_regclass(part) IS NULL THEN
        EXECUTE format(
          'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
          part, parent,
          to_char(month_start, 'YYYY-MM-DD') || ' 00:00:00+00',
          to_char((month_start + interval '1 month')::date, 'YYYY-MM-DD') || ' 00:00:00+00');
        PERFORM app_lock_audit_partition(part::regclass);
        created := created + 1;
      END IF;
    END LOOP;
  END LOOP;
  RETURN created;
END $$;--> statement-breakpoint
REVOKE ALL ON FUNCTION app_ensure_audit_partitions(integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_ensure_audit_partitions(integer) TO orbit_app;--> statement-breakpoint

-- A default partition catches rows outside the prepared months, so an audit insert never fails.
CREATE TABLE "audit_logs_default" PARTITION OF "audit_logs" DEFAULT;--> statement-breakpoint
CREATE TABLE "platform_audit_logs_default" PARTITION OF "platform_audit_logs" DEFAULT;--> statement-breakpoint
SELECT app_lock_audit_partition('audit_logs_default'::regclass);--> statement-breakpoint
SELECT app_lock_audit_partition('platform_audit_logs_default'::regclass);--> statement-breakpoint
SELECT app_ensure_audit_partitions(3);
