CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" "citext" NOT NULL,
	"role" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"invited_by" uuid,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "invitations_role_check" CHECK (role IN ('admin', 'agent'))
);
--> statement-breakpoint
ALTER TABLE "security_events" DROP CONSTRAINT "security_events_type_check";--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "agents_see_all_conversations" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_open_tenant_email_unique" ON "invitations" USING btree ("tenant_id","email") WHERE "invitations"."accepted_at" IS NULL AND "invitations"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "invitations_invited_by_idx" ON "invitations" USING btree ("invited_by");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_last_tenant_id_tenants_id_fk" FOREIGN KEY ("last_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_one_owner_per_tenant" ON "memberships" USING btree ("tenant_id") WHERE "memberships"."role" = 'owner';--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_type_check" CHECK (type IN ('signup', 'login_succeeded', 'login_failed', 'login_locked', 'refresh_token_reuse', 'logout', 'email_verified', 'password_reset_requested', 'password_reset', 'two_factor_enabled', 'two_factor_disabled', 'recovery_code_used', 'member_invited', 'member_role_changed', 'member_removed', 'ownership_transferred'));