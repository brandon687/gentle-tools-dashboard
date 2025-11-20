CREATE TABLE "daily_inventory_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_date" date NOT NULL,
	"location_id" uuid,
	"total_devices" integer NOT NULL,
	"total_value" numeric,
	"grade_breakdown" jsonb NOT NULL,
	"model_breakdown" jsonb NOT NULL,
	"lock_status_breakdown" jsonb NOT NULL,
	"daily_added" integer DEFAULT 0 NOT NULL,
	"daily_shipped" integer DEFAULT 0 NOT NULL,
	"daily_transferred" integer DEFAULT 0 NOT NULL,
	"daily_status_changes" integer DEFAULT 0 NOT NULL,
	"full_snapshot" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_sheets_sync_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_started_at" timestamp DEFAULT now() NOT NULL,
	"sync_completed_at" timestamp,
	"status" text NOT NULL,
	"items_processed" integer DEFAULT 0,
	"items_added" integer DEFAULT 0,
	"items_updated" integer DEFAULT 0,
	"items_unchanged" integer DEFAULT 0,
	"error_message" text,
	"error_details" jsonb,
	"sheets_row_count" integer,
	"db_item_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"imei" text NOT NULL,
	"model" text,
	"gb" text,
	"color" text,
	"sku" text,
	"current_grade" text,
	"current_lock_status" text,
	"current_location_id" uuid,
	"current_status" text NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_items_imei_unique" UNIQUE("imei")
);
--> statement-breakpoint
CREATE TABLE "inventory_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_locations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"movement_type" text NOT NULL,
	"from_location_id" uuid,
	"to_location_id" uuid,
	"from_status" text,
	"to_status" text,
	"from_grade" text,
	"to_grade" text,
	"from_lock_status" text,
	"to_lock_status" text,
	"notes" text,
	"source" text NOT NULL,
	"performed_by" text,
	"performed_at" timestamp DEFAULT now() NOT NULL,
	"snapshot_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbound_imeis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"imei" text NOT NULL,
	"model" text,
	"capacity" text,
	"color" text,
	"lock_status" text,
	"graded" text,
	"price" text,
	"updated_at" text,
	"invno" text,
	"invtype" text,
	"synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbound_sync_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_started_at" timestamp DEFAULT now() NOT NULL,
	"sync_completed_at" timestamp,
	"status" text NOT NULL,
	"rows_processed" integer DEFAULT 0,
	"rows_inserted" integer DEFAULT 0,
	"time_taken_ms" integer,
	"error_message" text,
	"error_details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipped_imeis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"imei" text NOT NULL,
	"source" text DEFAULT 'unknown' NOT NULL,
	"model" text,
	"grade" text,
	"supplier" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shipped_imeis_imei_unique" UNIQUE("imei")
);
--> statement-breakpoint
CREATE TABLE "user_activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"user_email" text NOT NULL,
	"activity_type" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"item_count" integer,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"performed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_activity_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"user_email" text NOT NULL,
	"total_imeis_dumped" integer DEFAULT 0 NOT NULL,
	"total_imeis_deleted" integer DEFAULT 0 NOT NULL,
	"total_logins" integer DEFAULT 0 NOT NULL,
	"total_syncs_triggered" integer DEFAULT 0 NOT NULL,
	"daily_breakdown" jsonb,
	"weekly_breakdown" jsonb,
	"monthly_breakdown" jsonb,
	"first_activity_at" timestamp,
	"last_activity_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"google_id" text,
	"role" text DEFAULT 'power_user' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
ALTER TABLE "daily_inventory_snapshots" ADD CONSTRAINT "daily_inventory_snapshots_location_id_inventory_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_current_location_id_inventory_locations_id_fk" FOREIGN KEY ("current_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_from_location_id_inventory_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_to_location_id_inventory_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_log" ADD CONSTRAINT "user_activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_stats" ADD CONSTRAINT "user_activity_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_snapshots_date_location" ON "daily_inventory_snapshots" USING btree ("snapshot_date","location_id");--> statement-breakpoint
CREATE INDEX "idx_snapshots_date" ON "daily_inventory_snapshots" USING btree ("snapshot_date");--> statement-breakpoint
CREATE INDEX "idx_sync_log_status" ON "google_sheets_sync_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sync_log_started" ON "google_sheets_sync_log" USING btree ("sync_started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_items_imei" ON "inventory_items" USING btree ("imei");--> statement-breakpoint
CREATE INDEX "idx_items_status" ON "inventory_items" USING btree ("current_status");--> statement-breakpoint
CREATE INDEX "idx_items_location" ON "inventory_items" USING btree ("current_location_id");--> statement-breakpoint
CREATE INDEX "idx_items_model" ON "inventory_items" USING btree ("model");--> statement-breakpoint
CREATE INDEX "idx_items_grade" ON "inventory_items" USING btree ("current_grade");--> statement-breakpoint
CREATE INDEX "idx_items_last_seen" ON "inventory_items" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "idx_locations_code" ON "inventory_locations" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_locations_active" ON "inventory_locations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_movements_item" ON "inventory_movements" USING btree ("item_id","performed_at");--> statement-breakpoint
CREATE INDEX "idx_movements_type" ON "inventory_movements" USING btree ("movement_type");--> statement-breakpoint
CREATE INDEX "idx_movements_date" ON "inventory_movements" USING btree ("performed_at");--> statement-breakpoint
CREATE INDEX "idx_movements_location_from" ON "inventory_movements" USING btree ("from_location_id");--> statement-breakpoint
CREATE INDEX "idx_movements_location_to" ON "inventory_movements" USING btree ("to_location_id");--> statement-breakpoint
CREATE INDEX "idx_movements_source" ON "inventory_movements" USING btree ("source");--> statement-breakpoint
CREATE INDEX "outbound_imeis_imei_idx" ON "outbound_imeis" USING btree ("imei");--> statement-breakpoint
CREATE INDEX "outbound_imeis_model_idx" ON "outbound_imeis" USING btree ("model");--> statement-breakpoint
CREATE INDEX "outbound_imeis_invno_idx" ON "outbound_imeis" USING btree ("invno");--> statement-breakpoint
CREATE INDEX "outbound_imeis_synced_at_idx" ON "outbound_imeis" USING btree ("synced_at");--> statement-breakpoint
CREATE INDEX "outbound_sync_log_status_idx" ON "outbound_sync_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "outbound_sync_log_started_idx" ON "outbound_sync_log" USING btree ("sync_started_at");--> statement-breakpoint
CREATE INDEX "idx_shipped_imeis_source" ON "shipped_imeis" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_shipped_imeis_created_at" ON "shipped_imeis" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_activity_user" ON "user_activity_log" USING btree ("user_id","performed_at");--> statement-breakpoint
CREATE INDEX "idx_activity_type" ON "user_activity_log" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "idx_activity_email" ON "user_activity_log" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "idx_activity_date" ON "user_activity_log" USING btree ("performed_at");--> statement-breakpoint
CREATE INDEX "idx_activity_resource" ON "user_activity_log" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_activity_stats_user" ON "user_activity_stats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_activity_stats_email" ON "user_activity_stats" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "idx_activity_stats_dumped" ON "user_activity_stats" USING btree ("total_imeis_dumped");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_google_id" ON "users" USING btree ("google_id");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_users_active" ON "users" USING btree ("is_active");