CREATE TABLE "lead_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"type" text NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"source" text DEFAULT 'Website' NOT NULL,
	"stage" text DEFAULT 'new' NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"mobile" text DEFAULT '' NOT NULL,
	"phone_key" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"project" text DEFAULT '' NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"interest" text DEFAULT '' NOT NULL,
	"budget" text DEFAULT '' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"page" text DEFAULT '' NOT NULL,
	"visit_date" text DEFAULT '' NOT NULL,
	"visit_slot" text DEFAULT '' NOT NULL,
	"visit_type" text DEFAULT '' NOT NULL,
	"agent" text DEFAULT '' NOT NULL,
	"follow_up_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"lost_reason" text DEFAULT '' NOT NULL,
	"ip_hash" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"duration_min" integer DEFAULT 60 NOT NULL,
	"type" text DEFAULT 'site' NOT NULL,
	"location" text NOT NULL,
	"project" text DEFAULT '' NOT NULL,
	"party" integer DEFAULT 2 NOT NULL,
	"agent" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"booked_by" text DEFAULT 'website' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_events_lead" ON "lead_events" USING btree ("lead_id","at");--> statement-breakpoint
CREATE INDEX "leads_created" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_stage" ON "leads" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "leads_phone_key" ON "leads" USING btree ("phone_key");--> statement-breakpoint
CREATE INDEX "leads_ip_created" ON "leads" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "visits_starts" ON "visits" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "visits_lead" ON "visits" USING btree ("lead_id");