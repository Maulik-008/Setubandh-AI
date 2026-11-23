CREATE TABLE "recovery_codes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "security_events" DROP CONSTRAINT "security_events_type_check";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "totp_last_step" bigint;--> statement-breakpoint
ALTER TABLE "recovery_codes" ADD CONSTRAINT "recovery_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recovery_codes_user_idx" ON "recovery_codes" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_type_check" CHECK (type IN ('signup', 'login_succeeded', 'login_failed', 'login_locked', 'refresh_token_reuse', 'logout', 'email_verified', 'password_reset_requested', 'password_reset', 'two_factor_enabled', 'two_factor_disabled', 'recovery_code_used'));