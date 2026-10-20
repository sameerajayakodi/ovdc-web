CREATE TABLE "activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"entity" text NOT NULL,
	"ref" text NOT NULL,
	"action" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_id" integer NOT NULL,
	"price_mn" numeric(10, 1) NOT NULL,
	"previous_mn" numeric(10, 1),
	"changed_by" text NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"loc" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"from_mn" numeric(10, 1),
	"tour" boolean DEFAULT false NOT NULL,
	"explorer" boolean DEFAULT false NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"completion" text DEFAULT '' NOT NULL,
	"uda" text DEFAULT '' NOT NULL,
	"units" integer DEFAULT 0 NOT NULL,
	"floors" integer DEFAULT 0 NOT NULL,
	"towers" text DEFAULT '' NOT NULL,
	"beds" text DEFAULT '' NOT NULL,
	"available_manual" integer DEFAULT 0 NOT NULL,
	"lat" real DEFAULT 6.9271 NOT NULL,
	"lng" real DEFAULT 79.8612 NOT NULL,
	"blurb" text DEFAULT '' NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_slug" text NOT NULL,
	"tower" text NOT NULL,
	"floor" integer NOT NULL,
	"letter" text NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"beds" integer NOT NULL,
	"label" text NOT NULL,
	"baths" real NOT NULL,
	"sqft" integer NOT NULL,
	"balcony" integer NOT NULL,
	"facing" text NOT NULL,
	"view" text NOT NULL,
	"status" text NOT NULL,
	"price_mn" numeric(10, 1) NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_project_slug_projects_slug_fk" FOREIGN KEY ("project_slug") REFERENCES "public"."projects"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "activity_at" ON "activity" USING btree ("at");--> statement-breakpoint
CREATE UNIQUE INDEX "units_project_tower_code" ON "units" USING btree ("project_slug","tower","code");--> statement-breakpoint
CREATE INDEX "units_project_tower" ON "units" USING btree ("project_slug","tower");