CREATE TABLE "floor_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_slug" text NOT NULL,
	"key" text NOT NULL,
	"type" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"sqft" integer DEFAULT 0 NOT NULL,
	"balcony" integer DEFAULT 0 NOT NULL,
	"facing" text DEFAULT '' NOT NULL,
	"view" text DEFAULT '' NOT NULL,
	"rooms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"media_id" integer,
	"sort" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"resource_type" text NOT NULL,
	"kind" text NOT NULL,
	"folder" text DEFAULT 'web' NOT NULL,
	"name" text NOT NULL,
	"format" text DEFAULT '' NOT NULL,
	"bytes" integer DEFAULT 0 NOT NULL,
	"width" integer DEFAULT 0 NOT NULL,
	"height" integer DEFAULT 0 NOT NULL,
	"duration" real DEFAULT 0 NOT NULL,
	"pages" integer DEFAULT 0 NOT NULL,
	"url" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "tour_scenes" (
	"id" serial PRIMARY KEY NOT NULL,
	"tour_id" text NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"short" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"panorama" text NOT NULL,
	"thumb" text DEFAULT '' NOT NULL,
	"media_id" integer,
	"yaw" real DEFAULT 0 NOT NULL,
	"rot" real DEFAULT 0 NOT NULL,
	"plan_x" real DEFAULT 100 NOT NULL,
	"plan_y" real DEFAULT 70 NOT NULL,
	"hotspots" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tours" (
	"id" text PRIMARY KEY NOT NULL,
	"project_slug" text NOT NULL,
	"type" text DEFAULT '' NOT NULL,
	"unit_ref" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"source" text DEFAULT 'pano' NOT NULL,
	"embed_url" text DEFAULT '' NOT NULL,
	"cover_media_id" integer,
	"bedrooms" text DEFAULT '' NOT NULL,
	"bathrooms" text DEFAULT '' NOT NULL,
	"parking" text DEFAULT '' NOT NULL,
	"plan_rooms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_project_slug_projects_slug_fk" FOREIGN KEY ("project_slug") REFERENCES "public"."projects"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_scenes" ADD CONSTRAINT "tour_scenes_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tour_scenes" ADD CONSTRAINT "tour_scenes_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_project_slug_projects_slug_fk" FOREIGN KEY ("project_slug") REFERENCES "public"."projects"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "floor_plans_project_type" ON "floor_plans" USING btree ("project_slug","type");--> statement-breakpoint
CREATE INDEX "media_folder" ON "media" USING btree ("folder","created_at");--> statement-breakpoint
CREATE INDEX "media_kind" ON "media" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "tour_scenes_key" ON "tour_scenes" USING btree ("tour_id","key");--> statement-breakpoint
CREATE INDEX "tour_scenes_sort" ON "tour_scenes" USING btree ("tour_id","sort");